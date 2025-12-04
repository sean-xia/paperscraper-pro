import { PROXY_PREFIX } from '../constants';

// Helper to handle potential legacy encoding (GBK/GB2312) common in old Chinese sites
const fetchUrl = async (url: string, useProxy: boolean): Promise<Document> => {
  const targetUrl = useProxy ? `${PROXY_PREFIX}${encodeURIComponent(url)}` : url;
  
  const response = await fetch(targetUrl);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const buffer = await response.arrayBuffer();
  
  // 1. Initial decode as UTF-8
  const utf8Decoder = new TextDecoder('utf-8');
  let text = utf8Decoder.decode(buffer);

  // 2. Aggressive GBK Detection
  // Check for meta charset tags indicating GBK/GB2312, or the presence of replacement characters
  const hasGBKMeta = /charset=["']?(gb2312|gbk)["']/i.test(text);
  const hasReplacementChars = text.includes('\uFFFD');

  if (hasGBKMeta || hasReplacementChars) {
    try {
      console.log(`Detected GBK/GB2312 (Meta: ${hasGBKMeta}, Replacement: ${hasReplacementChars}), switching decoder...`);
      const gbkDecoder = new TextDecoder('gbk');
      const gbkText = gbkDecoder.decode(buffer);
      // Only use GBK result if it looks valid
      if (gbkText && gbkText.length > 0) {
        text = gbkText;
      }
    } catch (e) {
      console.warn("GBK decode failed, falling back to UTF-8", e);
    }
  }

  const parser = new DOMParser();
  return parser.parseFromString(text, 'text/html');
};

export const generateDateRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  const currentDate = new Date(start);
  const stopDate = new Date(end);
  
  // Safety check for invalid dates
  if (isNaN(currentDate.getTime()) || isNaN(stopDate.getTime())) {
      return [];
  }

  while (currentDate <= stopDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const formatUrl = (pattern: string, dateStr: string, page: number = 1): string => {
  const [year, month, day] = dateStr.split('-');
  return pattern
    .replace('{YYYY}', year)
    .replace('{MM}', month)
    .replace('{DD}', day)
    .replace('{PAGE}', page.toString());
};

export const extractPageNavLinks = (doc: Document, baseUrl: string, selector: string): string[] => {
    // Default to looking for node_*.htm links if selector is generic
    const links = Array.from(doc.querySelectorAll(selector));
    const uniqueUrls = new Set<string>();
    const directory = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    
    // Always add the current page (Node 1) to ensure it's in the list
    uniqueUrls.add(baseUrl);

    links.forEach((link) => {
        const href = link.getAttribute('href');
        // We are looking for sibling pages like node_123.htm or node_2.htm
        // Filter out non-node links to be safe
        if (href && href.includes('node_') && !href.startsWith('javascript')) {
             const fullUrl = href.startsWith('http') ? href : directory + href;
             uniqueUrls.add(fullUrl);
        }
    });

    // Convert to array and sort. sorting helps process in order (node_1, node_2...) often
    return Array.from(uniqueUrls).sort();
}

interface ArticleLink {
    url: string;
    title: string;
}

export const extractArticleLinks = (doc: Document, baseUrl: string, selector: string): ArticleLink[] => {
  const links = Array.from(doc.querySelectorAll(selector));
  const urlMap = new Map<string, string>(); // URL -> Best Title Found

  // Base URL is directory of the current page, e.g. .../2023-10/01/
  const directory = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);

  links.forEach((link) => {
    // Handle both 'href' (a/area tags)
    const href = link.getAttribute('href');
    
    if (href && href !== '#' && !href.startsWith('javascript:')) {
      // Resolve relative URLs
      const fullUrl = href.startsWith('http') ? href : directory + href;
      
      // Attempt to extract a title from the link itself
      let linkText = link.textContent?.trim() || '';
      
      // If it's an AREA tag, it has no textContent, check 'alt' or 'title' attribute
      if (!linkText && link.tagName.toLowerCase() === 'area') {
          linkText = link.getAttribute('alt') || link.getAttribute('title') || '';
      }

      const existingTitle = urlMap.get(fullUrl) || '';
      
      // Logic to keep the "better" title (usually longer is better, unless it's just garbage)
      // Prioritize text content over empty existing
      if (!existingTitle || (linkText.length > existingTitle.length && linkText.length < 100)) {
          // A filter to avoid setting huge chunks of text as title if a whole block is wrapped in <a>
          if (linkText.length > 0) {
              urlMap.set(fullUrl, linkText);
          } else if (!urlMap.has(fullUrl)) {
              urlMap.set(fullUrl, ''); // Track URL even if no title yet
          }
      }
    }
  });

  return Array.from(urlMap.entries()).map(([url, title]) => ({ url, title }));
};

const collapseWhitespace = (str: string): string => {
    return str.replace(/\s+/g, ' ').trim();
};

export const parseArticleContent = (doc: Document, selectors: { title: string, content: string }, fallbackTitle: string = ''): { title: string, content: string } => {
  
  let titleText = '';
  
  // Strategy 1: Founder E-Paper Specific (Table Layout)
  // Intro title (yinbiaoti), Main title (zhubiaoti), Sub title (fubiaoti)
  // We use more specific selectors for table cells
  const introEl = doc.querySelector('.yinbiaoti, td.font00, .intro_title');
  const mainEl = doc.querySelector('.zhubiaoti, td.font01, .main_title, #title, h1');
  const subEl = doc.querySelector('.fubiaoti, td.font02, .sub_title');

  const introTitle = introEl ? collapseWhitespace(introEl.textContent || '') : '';
  const mainTitle = mainEl ? collapseWhitespace(mainEl.textContent || '') : '';
  const subTitle = subEl ? collapseWhitespace(subEl.textContent || '') : '';

  // Founder systems often put the title in td.font01. 
  if (mainTitle) {
      // Assemble full title
      titleText = [introTitle, mainTitle, subTitle].filter(t => t.length > 0).join(' ');
  } else {
      // Strategy 2: Generic Selector Fallback
      const titleEl = doc.querySelector(selectors.title);
      titleText = titleEl ? collapseWhitespace(titleEl.textContent || '') : '';
  }

  // Strategy 3: Image Alt fallback (sometimes titles are images in older systems)
  if (!titleText) {
      const titleImg = doc.querySelector('td.font01 img, .main_title img');
      if (titleImg) titleText = titleImg.getAttribute('alt') || '';
  }

  // Strategy 4: Fallback to the title discovered on the previous page (The Link Text)
  // This is often the most reliable for messy detail pages
  if ((!titleText || titleText.length < 2) && fallbackTitle) {
      console.log('Using fallback title from index page:', fallbackTitle);
      titleText = fallbackTitle;
  }

  // Strategy 5: Browser Page Title <title> tag
  if (!titleText || titleText === 'Untitled Article') {
      let pageTitle = doc.title;
      if (pageTitle) {
          // Remove common suffixes like " - China Education Daily"
          const separators = ['-', '_', '|'];
          for (const sep of separators) {
              if (pageTitle.includes(sep)) {
                  pageTitle = pageTitle.split(sep)[0];
                  break;
              }
          }
          titleText = pageTitle.trim();
      }
  }

  if (!titleText) titleText = 'Untitled Article';


  // --- Content Parsing ---
  const contentEl = doc.querySelector(selectors.content);
  let paragraphs: Element[] = [];
  
  if (contentEl) {
     const ps = Array.from(contentEl.querySelectorAll('p'));
     if (ps.length > 0) {
         paragraphs = ps;
     }
  }

  let contentText = '';
  if (paragraphs.length > 0) {
      contentText = paragraphs.map(p => p.textContent?.trim()).join('\n\n');
  } else {
      // Fallback: Just take the text of the container
      if (contentEl) {
         const clone = contentEl.cloneNode(true) as HTMLElement;
         // Replace <br> and </div> with newlines to preserve some structure
         const brs = clone.querySelectorAll('br');
         brs.forEach(br => br.replaceWith('\n'));
         
         const blockElements = clone.querySelectorAll('div, p, tr');
         blockElements.forEach(el => {
             el.after(doc.createTextNode('\n'));
         });

         // Sometimes text is in <font> or <span> tags directly
         contentText = clone.textContent || '';
         // Clean up excessive newlines generated by the replacement above
         contentText = contentText.replace(/\n\s*\n/g, '\n\n').trim();
      }
  }
  
  // Truncate overly long titles (sometimes parsing grabs the whole body)
  if (titleText.length > 200) {
      titleText = titleText.substring(0, 200) + "...";
  }

  return {
    title: titleText,
    content: contentText || '',
  };
};

export { fetchUrl };