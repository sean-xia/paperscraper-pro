export const DEFAULT_CONFIG = {
  // Pattern supports {YYYY}, {MM}, {DD}, and {PAGE} replacement
  // For jyb.cn, {PAGE} maps to node_1, node_2 etc. but actually only node_1 is predictable.
  // The app now uses node_1 to discover other nodes.
  baseUrlPattern: 'http://paper.jyb.cn/zgjyb/html/{YYYY}-{MM}/{DD}/node_{PAGE}.htm',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  maxPages: 20, // Check up to 20 pages (usually papers are 4-12 pages)

  // Selector to find other page links from the first page.
  // a[href^="node_"] captures "node_123.htm" links usually found in the "版面导航" sidebar.
  pageLinkSelector: 'a[href^="node_"]',

  // Updated selector to include <area> tags used in image maps (common in Founder systems)
  articleLinkSelector: 'a[href^="content_"], area[href^="content_"]',

  // Broader content selectors
  // #article_content is standard Founder;
  contentSelector: '#article_content, founder-content, .text, .article-content, .blkContainerSblkCon, #ozoom, td.font02',

  // Improved Title Selectors
  // td.font01 is the specific class for Main Title in Founder systems
  // Added #title and specific table structure classes. Removed plain h1 to avoid unrelated headers.
  titleSelector: 'td.font01, .yinbiaoti, .zhubiaoti, .fubiaoti, #artibodyTitle, #title, .title',

  useProxy: true,
  delayMs: 3000, // Base delay (will be randomized)
  minDelay: 2000, // Minimum delay between requests (2 seconds)
  maxDelay: 6000, // Maximum delay between requests (6 seconds)
  pageDelay: 5000, // Extra delay after processing each page
  retryDelay: 10000, // Delay before retry on failure (10 seconds)
  maxRetries: 3, // Maximum number of retries
};

export const PROXY_PREFIX = 'https://api.allorigins.win/raw?url=';