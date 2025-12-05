import React from 'react';
import { ScrapeConfig } from '../types';
import { SettingsIcon } from './Icons';

interface ConfigPanelProps {
  config: ScrapeConfig;
  onChange: (key: keyof ScrapeConfig, value: any) => void;
  disabled: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, disabled }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h2 className="text-lg font-semibold flex items-center gap-2">
            <SettingsIcon />
            Configuration
        </h2>
        <span className="text-gray-400 text-sm">{isOpen ? 'Hide' : 'Show'}</span>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-full">
            <label className="block text-xs text-gray-400 mb-1">URL Pattern</label>
            <div className="text-xs text-gray-500 mb-1">Use <code>&#123;YYYY&#125; &#123;MM&#125; &#123;DD&#125;</code> for date, <code>&#123;PAGE&#125;</code> for page number (e.g. node_1)</div>
            <input
              type="text"
              value={config.baseUrlPattern}
              onChange={(e) => onChange('baseUrlPattern', e.target.value)}
              disabled={disabled}
              placeholder="http://site.com/{YYYY}-{MM}/{DD}/node_{PAGE}.htm"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <input
              type="date"
              value={config.startDate}
              onChange={(e) => onChange('startDate', e.target.value)}
              disabled={disabled}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">End Date</label>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => onChange('endDate', e.target.value)}
              disabled={disabled}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Max Pages to Scan</label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.maxPages}
              onChange={(e) => onChange('maxPages', parseInt(e.target.value) || 1)}
              disabled={disabled}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Request Delay (ms)</label>
             <input
              type="number"
              value={config.delayMs}
              onChange={(e) => onChange('delayMs', parseInt(e.target.value))}
              disabled={disabled}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="col-span-full">
            <details>
                <summary className="text-xs text-gray-500 cursor-pointer mb-2">Advanced Selectors</summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs text-gray-400 mb-1">Page Link Selector</label>
                        <input
                        type="text"
                        value={config.pageLinkSelector}
                        onChange={(e) => onChange('pageLinkSelector', e.target.value)}
                        disabled={disabled}
                        placeholder='a[href^="node_"]'
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                     <div>
                        <label className="block text-xs text-gray-400 mb-1">Article Link Selector</label>
                        <input
                        type="text"
                        value={config.articleLinkSelector}
                        onChange={(e) => onChange('articleLinkSelector', e.target.value)}
                        disabled={disabled}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Title Selector</label>
                        <input
                        type="text"
                        value={config.titleSelector}
                        onChange={(e) => onChange('titleSelector', e.target.value)}
                        disabled={disabled}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Content Selector</label>
                        <input
                        type="text"
                        value={config.contentSelector}
                        onChange={(e) => onChange('contentSelector', e.target.value)}
                        disabled={disabled}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-xs focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
            </details>
          </div>

          <div className="col-span-full">
            <details open>
                <summary className="text-xs text-gray-500 cursor-pointer mb-2 font-semibold">🛡️ Anti-bot Protection</summary>
                <div className="space-y-3 mt-2">
                  {/* Rate Limiting Section */}
                  <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="rateLimitCheck"
                        checked={config.enableRateLimiting || false}
                        onChange={(e) => onChange('enableRateLimiting', e.target.checked)}
                        disabled={disabled}
                        className="mr-2"
                      />
                      <label htmlFor="rateLimitCheck" className="text-sm text-gray-300 font-medium">
                        Enable Smart Rate Limiting
                      </label>
                    </div>

                    {config.enableRateLimiting && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-6">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Batch Size (dates)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={config.batchSize || 3}
                            onChange={(e) => onChange('batchSize', parseInt(e.target.value) || 3)}
                            disabled={disabled}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Scrape N dates before cooldown</p>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Cooldown (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={config.cooldownMinutes || 15}
                            onChange={(e) => onChange('cooldownMinutes', parseInt(e.target.value) || 15)}
                            disabled={disabled}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Wait time between batches</p>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Daily Limit (0=unlimited)</label>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            value={config.dailyArticleLimit || 0}
                            onChange={(e) => onChange('dailyArticleLimit', parseInt(e.target.value) || 0)}
                            disabled={disabled}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">Max articles per day</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Request Randomization Section */}
                  <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="randomUACheck"
                          checked={config.enableRandomUserAgent || false}
                          onChange={(e) => onChange('enableRandomUserAgent', e.target.checked)}
                          disabled={disabled}
                          className="mr-2"
                        />
                        <label htmlFor="randomUACheck" className="text-sm text-gray-300">
                          Randomize User-Agent
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="randomHeadersCheck"
                          checked={config.randomizeHeaders || false}
                          onChange={(e) => onChange('randomizeHeaders', e.target.checked)}
                          disabled={disabled}
                          className="mr-2"
                        />
                        <label htmlFor="randomHeadersCheck" className="text-sm text-gray-300">
                          Randomize Request Headers
                        </label>
                      </div>

                      <p className="text-xs text-gray-500 pl-6">
                        Note: Some headers may be ignored by browser security policies
                      </p>
                    </div>
                  </div>
                </div>
            </details>
          </div>

           <div className="flex items-center pt-2">
            <input
              type="checkbox"
              id="proxyCheck"
              checked={config.useProxy}
              onChange={(e) => onChange('useProxy', e.target.checked)}
              disabled={disabled}
              className="mr-2"
            />
            <label htmlFor="proxyCheck" className="text-sm text-gray-300">Use CORS Proxy (Recommended)</label>
          </div>
        </div>
      )}
    </div>
  );
};