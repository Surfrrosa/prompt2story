import { useState } from 'react';

interface InputFormProps {
  onSubmit: (data: FormData) => void;
  loading: boolean;
}

interface FormData {
  prompt: string;
  includeMetadata: boolean;
  includeAdvancedCriteria: boolean;
  persona: string;
}

export function InputForm({ onSubmit, loading }: InputFormProps) {
  const [formData, setFormData] = useState<FormData>({
    prompt: '',
    includeMetadata: false,
    includeAdvancedCriteria: true,
    persona: 'EndUser'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.prompt.trim()) {
      onSubmit(formData);
    }
  };

  const handleExampleClick = (example: string) => {
    setFormData(prev => ({ ...prev, prompt: example }));
  };

  const examples = [
    "Users need to be able to reset their password via email",
    "Create a dashboard showing sales metrics and charts",
    "Implement a shopping cart with add/remove items functionality",
    "Build a notification system for real-time alerts"
  ];

  return (
    <div className="w-full max-w-2xl mx-auto border rounded-lg shadow-sm bg-white">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          📝 Generate User Stories
        </h2>
      </div>
      
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
              Describe your feature or requirement
            </label>
            <textarea
              id="prompt"
              placeholder="Enter meeting notes, requirements, or feature descriptions..."
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Quick Examples</label>
            <div className="grid grid-cols-1 gap-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="text-left p-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <label className="block text-sm font-medium text-gray-700">Options</label>
            
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="advanced-criteria" className="text-sm font-medium text-gray-700">
                  Advanced Acceptance Criteria
                </label>
                <p className="text-xs text-gray-500">
                  Generate detailed Given/When/Then criteria
                </p>
              </div>
              <input
                type="checkbox"
                id="advanced-criteria"
                checked={formData.includeAdvancedCriteria}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, includeAdvancedCriteria: e.target.checked }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="metadata" className="text-sm font-medium text-gray-700">
                  Include Metadata
                </label>
                <p className="text-xs text-gray-500">
                  Add priority levels and story points
                </p>
              </div>
              <input
                type="checkbox"
                id="metadata"
                checked={formData.includeMetadata}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, includeMetadata: e.target.checked }))
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={loading || !formData.prompt.trim()}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Generating Stories...
              </>
            ) : (
              <>
                🪄 Generate User Stories
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
