import { useState } from 'react';

interface UserStory {
  title: string;
  story: string;
  acceptance_criteria: string[];
  priority?: string;
  story_points?: number;
}

interface StoryCardProps {
  story: UserStory;
  onRegenerate?: (story: UserStory) => void;
  showMetadata?: boolean;
}

export function StoryCard({ story, onRegenerate, showMetadata = false }: StoryCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `${story.title}\n\n${story.story}\n\nAcceptance Criteria:\n${story.acceptance_criteria.map(c => `- ${c}`).join('\n')}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 px-2 py-1 rounded text-xs';
      case 'medium': return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs';
      case 'low': return 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs';
      default: return 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs';
    }
  };

  return (
    <div className="w-full border rounded-lg shadow-sm bg-white">
      <div className="p-4 pb-3 border-b">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold leading-tight text-gray-900">
            {story.title}
          </h3>
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
            >
              📋 {copied ? 'Copied!' : 'Copy'}
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(story)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                🔄 Regenerate
              </button>
            )}
          </div>
        </div>
        
        {showMetadata && (story.priority || story.story_points) && (
          <div className="flex gap-2 mt-2">
            {story.priority && (
              <span className={getPriorityColor(story.priority)}>
                {story.priority} Priority
              </span>
            )}
            {story.story_points && (
              <span className="border border-gray-300 px-2 py-1 rounded text-xs">
                {story.story_points} Points
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-4">
        <p className="text-gray-700 leading-relaxed">
          {story.story}
        </p>
        
        {story.acceptance_criteria.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
              ✅ Acceptance Criteria
            </h4>
            <ul className="space-y-1">
              {story.acceptance_criteria.map((criteria, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{criteria}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
