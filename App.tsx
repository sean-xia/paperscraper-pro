import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { AppStatus, Article, LogEntry, ScrapeConfig } from './types';
import { DEFAULT_CONFIG } from './constants';
import { ConfigPanel } from './components/ConfigPanel';
import { ArticleList } from './components/ArticleList';
import { generateDateRange, formatUrl, fetchUrl, extractArticleLinks, parseArticleContent, extractPageNavLinks } from './services/scraperService';
import { cleanContentWithGemini } from './services/geminiService';
import { PlayIcon, PauseIcon, DownloadIcon, MagicWandIcon } from './components/Icons';
import { RateLimiter } from './services/antibot';

function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [config, setConfig] = useState<ScrapeConfig>(DEFAULT_CONFIG);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const rateLimiterRef = useRef<RateLimiter | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [...prev, { id: uuidv4(), timestamp: new Date(), message, type }]);
  };

  const handleConfigChange = (key: keyof ScrapeConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Random delay to avoid detection as bot
  const randomDelay = (min?: number, max?: number) => {
    const minMs = min || config.minDelay || 2000;
    const maxMs = max || config.maxDelay || 6000;
    const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    addLog(`⏱️ Waiting ${(randomMs / 1000).toFixed(1)}s...`, 'info');
    return delay(randomMs);
  };

  // Fetch with retry mechanism
  const fetchWithRetry = async (url: string, retries = 0): Promise<Document> => {
    const maxRetries = config.maxRetries || 3;
    try {
      return await fetchUrl(url, {
        useProxy: config.useProxy,
        randomizeUserAgent: config.enableRandomUserAgent,
        randomizeHeaders: config.randomizeHeaders,
      });
    } catch (error: any) {
      if (retries < maxRetries) {
        const retryNum = retries + 1;
        addLog(`❌ Fetch failed (attempt ${retryNum}/${maxRetries + 1}): ${error.message}`, 'warning');
        addLog(`⏳ Waiting ${config.retryDelay || 10000}ms before retry...`, 'warning');
        await delay(config.retryDelay || 10000);
        return fetchWithRetry(url, retryNum);
      } else {
        addLog(`❌ Fetch failed after ${maxRetries + 1} attempts: ${url}`, 'error');
        throw error;
      }
    }
  };

  const startScraping = useCallback(async () => {
    if (status === AppStatus.RUNNING) return;

    setStatus(AppStatus.RUNNING);
    setProgress(0);
    setLogs([]);
    setArticles([]);
    abortControllerRef.current = new AbortController();

    // Initialize Rate Limiter if enabled
    if (config.enableRateLimiting) {
      rateLimiterRef.current = new RateLimiter(
        config.batchSize || 3,
        config.cooldownMinutes || 15,
        config.dailyArticleLimit || 0
      );
      addLog(`🛡️ Rate limiting enabled: ${config.batchSize} dates per batch, ${config.cooldownMinutes}min cooldown`, 'info');
    } else {
      rateLimiterRef.current = null;
    }

    try {
      const dates = generateDateRange(config.startDate, config.endDate);

      if (dates.length === 0) {
          addLog("Invalid date range selected.", "error");
          setStatus(AppStatus.IDLE);
          return;
      }

      addLog(`Queue: ${dates.length} days (${config.startDate} to ${config.endDate})`);

      let processedCount = 0;
      const totalSteps = dates.length;

      for (const date of dates) {
        if (abortControllerRef.current?.signal.aborted) break;

        // Check batch limit (rate limiting)
        if (rateLimiterRef.current) {
          const batchCheck = rateLimiterRef.current.checkBatchLimit();
          if (batchCheck.shouldCooldown) {
            const cooldownMs = (batchCheck.waitMinutes || 0) * 60 * 1000;
            addLog(`🔒 Batch limit reached. Cooling down for ${batchCheck.waitMinutes} minutes...`, 'warning');
            addLog(`⏰ Cooldown started at ${new Date().toLocaleTimeString()}`, 'info');

            // Wait for cooldown period
            await delay(cooldownMs);

            addLog(`✅ Cooldown complete. Resuming at ${new Date().toLocaleTimeString()}`, 'success');
          }
        }

        addLog(`=== Processing Date: ${date} ===`, 'info');

        // 1. Fetch the entry page (usually Node 1)
        const entryUrl = formatUrl(config.baseUrlPattern, date, 1);
        addLog(`Fetching Entry Page: ${entryUrl}`);

        let pageNodes: string[] = [];

        try {
            const entryDoc = await fetchWithRetry(entryUrl);

            // 2. Discover all page links (node_*.htm) from the entry page
            // This grabs the sidebar links "Page 01, Page 02, Page 03..."
            const discoveredNodes = extractPageNavLinks(entryDoc, entryUrl, config.pageLinkSelector || 'a[href^="node_"]');

            if (discoveredNodes.length > 0) {
                pageNodes = discoveredNodes;
                addLog(`Found ${pageNodes.length} pages in edition.`);
            } else {
                // Fallback: If no nav links found, maybe it's just a single page or selector failed
                addLog(`No page navigation links found. Trying just the entry page.`, 'warning');
                pageNodes = [entryUrl];
            }

        } catch (err: any) {
             addLog(`Failed to fetch entry page for ${date}: ${err.message}`, 'error');
             processedCount++;
             setProgress((processedCount / totalSteps) * 100);
             continue; // Skip this date
        }

        // Random delay after fetching entry page
        await randomDelay();

        // 3. Iterate through all discovered pages (nodes)
        // We limit by maxPages just in case the selector grabbed too many junk links
        const nodesToScan = pageNodes.slice(0, config.maxPages);

        for (let i = 0; i < nodesToScan.length; i++) {
             const nodeUrl = nodesToScan[i];
             if (abortControllerRef.current?.signal.aborted) break;
             
             addLog(`Scanning Page ${i + 1}/${nodesToScan.length}: ${nodeUrl.split('/').pop()}`);

             try {
                // We might have already fetched entry page, but fetching again is simpler logic
                // unless we cache. Given the delay, it's fine.
                const nodeDoc = await fetchWithRetry(nodeUrl);

                // Get list of articles ({url, title})
                const articleLinks = extractArticleLinks(nodeDoc, nodeUrl, config.articleLinkSelector);

                if (articleLinks.length === 0) {
                    addLog(`No articles found on ${nodeUrl}`, 'warning');
                    // Add delay even when no articles found
                    await randomDelay();
                    continue;
                }

                addLog(`Found ${articleLinks.length} articles on this page.`);

                for (const linkObj of articleLinks) {
                    if (abortControllerRef.current?.signal.aborted) break;

                    // Check daily article limit
                    if (rateLimiterRef.current) {
                      const dailyCheck = rateLimiterRef.current.checkDailyLimit();
                      if (!dailyCheck.canProceed) {
                        addLog(`🚫 Daily article limit reached (${config.dailyArticleLimit}). Stopping.`, 'warning');
                        setStatus(AppStatus.COMPLETED);
                        return;
                      }
                      if (dailyCheck.remaining && dailyCheck.remaining <= 10) {
                        addLog(`⚠️ Approaching daily limit: ${dailyCheck.remaining} articles remaining`, 'warning');
                      }
                    }

                    // Avoid duplicates
                    if (articles.some(a => a.url === linkObj.url)) continue;

                    // Random delay between articles to avoid bot detection
                    await randomDelay();

                    try {
                        const articleDoc = await fetchWithRetry(linkObj.url);
                        
                        // Pass the title we found on the index page as a fallback hint
                        const { title, content } = parseArticleContent(
                            articleDoc, 
                            { 
                                title: config.titleSelector, 
                                content: config.contentSelector 
                            },
                            linkObj.title // <--- Fallback Hint
                        );

                        if (!content || content.length < 20) {
                            addLog(`Skipping empty/short content: ${linkObj.url.split('/').pop()}`, 'warning');
                            continue;
                        }

                        const pageNum = (i + 1).toString().padStart(2, '0');

                        const newArticle: Article = {
                        id: uuidv4(),
                        date,
                        page: pageNum,
                        title,
                        content,
                        markdown: `# ${title}\n\n**Date:** ${date} | **Page:** ${pageNum}\n\n${content}`,
                        url: linkObj.url,
                        status: 'success'
                        };

                        setArticles((prev) => [...prev, newArticle]);

                        // Mark article as processed for rate limiting
                        if (rateLimiterRef.current) {
                          rateLimiterRef.current.markArticleProcessed();
                        }
                    } catch (err: any) {
                        addLog(`Failed to parse article ${linkObj.url}: ${err.message}`, 'error');
                    }
                }

             } catch (err: any) {
                 addLog(`Failed to scan page node ${nodeUrl}: ${err.message}`, 'error');
             }

             // Extra delay between pages to avoid bot detection
             if (i < nodesToScan.length - 1) {
                 addLog(`📄 Page ${i + 1} complete. Waiting before next page...`, 'info');
                 await delay(config.pageDelay || 5000);
             }
        }

        processedCount++;
        setProgress((processedCount / totalSteps) * 100);

        // Mark date as processed for batch rate limiting
        if (rateLimiterRef.current) {
          rateLimiterRef.current.markDateProcessed();
        }
      }

      setStatus(AppStatus.COMPLETED);
      addLog('Job completed!', 'success');

    } catch (err: any) {
      addLog(`Global Error: ${err.message}`, 'error');
      setStatus(AppStatus.ERROR);
    }
  }, [config, status, articles]);

  const stopScraping = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus(AppStatus.PAUSED);
    addLog('Scraping stopped by user.', 'warning');
  };

  const optimizeArticle = async (id: string) => {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    addLog(`Optimizing "${article.title}" with Gemini...`, 'info');
    
    try {
        const cleanMd = await cleanContentWithGemini(article.content, article.title);
        const refinedMd = `# ${article.title}\n\n**Date:** ${article.date} | **Page:** ${article.page}\n**Source:** [Link](${article.url})\n\n---\n\n${cleanMd}`;
        
        setArticles(prev => prev.map(a => a.id === id ? { ...a, markdown: refinedMd } : a));
        addLog(`Optimization complete for "${article.title}"`, 'success');
    } catch (e) {
        addLog(`Optimization failed: ${e}`, 'error');
    }
  };

  const deleteArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id));
    if (selectedArticleId === id) setSelectedArticleId(null);
  };

  const exportAll = async () => {
    if (articles.length === 0) {
      addLog('No articles to export', 'warning');
      return;
    }

    addLog('Creating ZIP archive...', 'info');

    try {
      const zip = new JSZip();

      // Helper function to sanitize filename
      const sanitizeFilename = (str: string): string => {
        return str
          .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Remove illegal characters
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/_{2,}/g, '_') // Remove multiple underscores
          .substring(0, 100); // Limit length
      };

      // Group articles by date
      const articlesByDate: { [date: string]: Article[] } = {};
      articles.forEach(article => {
        if (!articlesByDate[article.date]) {
          articlesByDate[article.date] = [];
        }
        articlesByDate[article.date].push(article);
      });

      // Create folder for each date and add articles
      Object.keys(articlesByDate).sort().forEach(date => {
        const dateFolder = zip.folder(date);
        if (!dateFolder) return;

        const articlesForDate = articlesByDate[date];
        articlesForDate.forEach((article, index) => {
          const safeTitle = sanitizeFilename(article.title);
          const filename = `${String(index + 1).padStart(3, '0')}_${safeTitle}.md`;
          dateFolder.file(filename, article.markdown);
        });

        addLog(`Added ${articlesForDate.length} articles for ${date}`, 'info');
      });

      // Generate ZIP file
      const blob = await zip.generateAsync({ type: 'blob' });

      // Download ZIP
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paper_export_${config.startDate}_to_${config.endDate}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog(`Successfully exported ${articles.length} articles in ZIP format`, 'success');
    } catch (error: any) {
      addLog(`Export failed: ${error.message}`, 'error');
    }
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">PS</div>
            <h1 className="text-xl font-bold tracking-tight">PaperScraper Pro</h1>
        </div>
        <div className="flex gap-4 items-center">
            {status === AppStatus.RUNNING ? (
                <button 
                  onClick={stopScraping}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors font-medium text-sm"
                >
                  <PauseIcon /> Stop Scraping
                </button>
            ) : (
                <button 
                  onClick={startScraping}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors font-medium text-sm"
                >
                  <PlayIcon /> Start Scraping
                </button>
            )}
            <button 
              onClick={exportAll}
              disabled={articles.length === 0}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded border border-gray-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadIcon /> Export MD
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Config & Logs */}
        <aside className="w-96 flex flex-col bg-gray-900 border-r border-gray-800 shrink-0">
          <div className="p-4 overflow-y-auto flex-1">
            <ConfigPanel 
              config={config} 
              onChange={handleConfigChange} 
              disabled={status === AppStatus.RUNNING} 
            />
            
            <div className="mb-4">
                <div className="flex justify-between items-end mb-2">
                    <h3 className="text-sm font-semibold text-gray-300">Execution Logs</h3>
                    <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="bg-black/50 rounded border border-gray-800 p-2 h-64 overflow-y-auto font-mono text-xs">
                {logs.length === 0 && <span className="text-gray-600">Ready to start...</span>}
                {logs.map((log) => (
                    <div key={log.id} className={`mb-1 break-words ${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        log.type === 'warning' ? 'text-yellow-400' : 
                        'text-gray-400'
                    }`}>
                        <span className="opacity-50">[{log.timestamp.toLocaleTimeString()}]</span> {log.message}
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
          </div>
        </aside>

        {/* Middle: Article List */}
        <div className="w-80 flex flex-col bg-gray-900 border-r border-gray-800 shrink-0">
            <div className="p-3 border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
                <h2 className="font-semibold text-gray-300 text-sm">Extracted Articles ({articles.length})</h2>
            </div>
            <div className="overflow-y-auto p-3 flex-1">
                <ArticleList 
                    articles={articles} 
                    onDelete={deleteArticle} 
                    onOptimize={optimizeArticle}
                    selectedId={selectedArticleId}
                    onSelect={setSelectedArticleId}
                />
            </div>
        </div>

        {/* Right: Preview */}
        <main className="flex-1 flex flex-col bg-gray-950 overflow-hidden relative">
            {!selectedArticle ? (
                <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center">
                        <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                    </div>
                    <p>Select an article to preview markdown</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
                     <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                        <h2 className="text-2xl font-bold text-white">{selectedArticle.title}</h2>
                        <button 
                            onClick={() => optimizeArticle(selectedArticle.id)}
                            className="text-sm flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            <MagicWandIcon /> Clean with AI
                        </button>
                     </div>
                     <div className="prose prose-invert prose-blue max-w-none">
                         <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-900 p-4 rounded border border-gray-800 text-gray-300">
                             {selectedArticle.markdown}
                         </pre>
                     </div>
                </div>
            )}
        </main>
      </div>
    </div>
  );
}

export default App;