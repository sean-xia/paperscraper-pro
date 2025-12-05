/**
 * Anti-bot detection utilities
 * Provides User-Agent rotation, header randomization, and rate limiting
 */

// Real browser User-Agent pool (Windows, Mac, Linux mix)
const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',

  // Chrome on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',

  // Firefox on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',

  // Safari on Mac
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',

  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',

  // Chrome on Linux
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
];

// Accept-Language variations
const ACCEPT_LANGUAGES = [
  'zh-CN,zh;q=0.9,en;q=0.8',
  'zh-CN,zh;q=0.9',
  'zh-CN,zh-TW;q=0.9,zh;q=0.8,en;q=0.7',
  'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  'zh-CN,en-US;q=0.9,en;q=0.8',
];

/**
 * Get a random User-Agent from the pool
 */
export const getRandomUserAgent = (): string => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

/**
 * Generate randomized browser-like headers
 */
export const generateRandomHeaders = (baseUrl?: string): Record<string, string> => {
  const headers: Record<string, string | undefined> = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)],
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': Math.random() > 0.5 ? '1' : undefined, // Do Not Track (50% chance)
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };

  // Add Referer header sometimes (to simulate navigation from homepage)
  if (baseUrl && Math.random() > 0.3) {
    try {
      const url = new URL(baseUrl);
      headers['Referer'] = `${url.protocol}//${url.host}/`;
    } catch (e) {
      // Invalid URL, skip referer
    }
  }

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(headers).filter(([_, v]) => v !== undefined)
  ) as Record<string, string>;
};

/**
 * Rate Limiter - Manages scraping quotas and cooldowns
 */
export class RateLimiter {
  private processedDates: number = 0;
  private processedArticlesToday: number = 0;
  private lastResetDate: string = '';
  private batchStartTime: number = 0;

  constructor(
    private batchSize: number,
    private cooldownMinutes: number,
    private dailyArticleLimit: number
  ) {
    this.resetIfNewDay();
  }

  /**
   * Reset counters if it's a new day
   */
  private resetIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastResetDate !== today) {
      this.processedArticlesToday = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Check if we need to cooldown before processing next date
   * Returns: { shouldCooldown: boolean, waitMinutes?: number }
   */
  checkBatchLimit(): { shouldCooldown: boolean; waitMinutes?: number } {
    if (this.processedDates === 0) {
      // First date, start the batch timer
      this.batchStartTime = Date.now();
      return { shouldCooldown: false };
    }

    if (this.processedDates % this.batchSize === 0) {
      // Completed a batch, need cooldown
      return {
        shouldCooldown: true,
        waitMinutes: this.cooldownMinutes,
      };
    }

    return { shouldCooldown: false };
  }

  /**
   * Mark a date as processed
   */
  markDateProcessed() {
    this.processedDates++;
  }

  /**
   * Check if we've hit the daily article limit
   * Returns: { canProceed: boolean, remaining?: number }
   */
  checkDailyLimit(): { canProceed: boolean; remaining?: number } {
    this.resetIfNewDay();

    if (this.dailyArticleLimit === 0) {
      // No limit
      return { canProceed: true };
    }

    if (this.processedArticlesToday >= this.dailyArticleLimit) {
      return {
        canProceed: false,
        remaining: 0,
      };
    }

    return {
      canProceed: true,
      remaining: this.dailyArticleLimit - this.processedArticlesToday,
    };
  }

  /**
   * Mark an article as processed
   */
  markArticleProcessed() {
    this.processedArticlesToday++;
  }

  /**
   * Get statistics
   */
  getStats() {
    this.resetIfNewDay();
    return {
      processedDates: this.processedDates,
      processedArticlesToday: this.processedArticlesToday,
      dailyLimit: this.dailyArticleLimit,
      batchSize: this.batchSize,
    };
  }

  /**
   * Reset all counters (for testing or manual reset)
   */
  reset() {
    this.processedDates = 0;
    this.processedArticlesToday = 0;
    this.batchStartTime = 0;
  }
}
