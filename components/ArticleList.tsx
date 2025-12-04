import React from 'react';
import { Article } from '../types';
import { MagicWandIcon, TrashIcon } from './Icons';

interface ArticleListProps {
  articles: Article[];
  onDelete: (id: string) => void;
  onOptimize: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({ articles, onDelete, onOptimize, selectedId, onSelect }) => {
  if (articles.length === 0) {
    return <div className="p-8 text-center text-gray-500 italic">No articles extracted yet.</div>;
  }

  return (
    <div className="space-y-2">
      {articles.map((article) => (
        <div
          key={article.id}
          onClick={() => onSelect(article.id)}
          className={`group p-3 rounded cursor-pointer border transition-all ${
            selectedId === article.id
              ? 'bg-blue-900/30 border-blue-500'
              : 'bg-gray-800 border-gray-700 hover:border-gray-500'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-gray-200 truncate pr-2" title={article.title}>
                {article.title || 'Untitled'}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {article.date} | {article.content.length} chars
              </p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onOptimize(article.id); }}
                className="p-1 hover:bg-gray-700 rounded text-purple-400"
                title="Optimize with Gemini"
              >
                <MagicWandIcon />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(article.id); }}
                className="p-1 hover:bg-gray-700 rounded text-red-400"
                title="Remove"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
