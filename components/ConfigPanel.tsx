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