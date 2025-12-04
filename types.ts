export interface ScrapeConfig {
  baseUrlPattern: string; // e.g., http://paper.jyb.cn/zgjyb/html/{YYYY}-{MM}/{DD}/node_{PAGE}.htm
  startDate: string;
  endDate: string;
  maxPages: number; // Maximum number of pages (nodes) to scrape per date (e.g., node_1 to node_20)
  pageLinkSelector: string; // CSS selector to find other page links
  articleLinkSelector: string; // CSS selector to find article links on the node page
  contentSelector: string; // CSS selector to find the body content
  titleSelector: string; // CSS selector for title
  useProxy: boolean; // Whether to use a CORS proxy
  delayMs: number; // Base delay between requests (will be randomized)
  minDelay?: number; // Minimum random delay between requests (ms)
  maxDelay?: number; // Maximum random delay between requests (ms)
  pageDelay?: number; // Extra delay after processing each page (ms)
  retryDelay?: number; // Delay before retry on failure (ms)
  maxRetries?: number; // Maximum number of retry attempts
}

export interface Article {
  id: string;
  date: string;
  page: string;
  title: string;
  content: string; // Raw HTML or Text
  markdown: string;
  url: string;
  status: 'pending' | 'success' | 'failed' | 'processing';
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export enum AppStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}