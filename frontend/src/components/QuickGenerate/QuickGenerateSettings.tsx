import { Settings, ChevronRight } from '@/components/icons'
import type { QuickGenerateSettings as QuickGenerateSettingsType } from '@/hooks/useQuickGenerate'

interface QuickGenerateSettingsProps {
  settings: QuickGenerateSettingsType
  disabled: boolean
  onSettingsChange: React.Dispatch<React.SetStateAction<QuickGenerateSettingsType>>
}

export function QuickGenerateSettings({
  settings,
  disabled,
  onSettingsChange,
}: QuickGenerateSettingsProps) {
  return (
    <div className="space-y-3 p-3 bg-charcoal-light rounded-lg border border-charcoal-light">
      <div className="flex items-center space-x-3">
        <Settings className="h-4 w-4 text-soft-gray" />
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.includeMetadata}
            onChange={(e) => onSettingsChange(s => ({ ...s, includeMetadata: e.target.checked }))}
            className="w-4 h-4 text-vivid-purple bg-charcoal-light border-soft-gray rounded focus:ring-vivid-purple focus:ring-2"
            disabled={disabled}
          />
          <span className="text-sm text-soft-gray">Add Suggested Metadata</span>
        </label>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm text-soft-gray hover:text-pure-white flex items-center space-x-1">
          <Settings className="h-4 w-4" />
          <span>Advanced Options</span>
          <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2 ml-5 space-y-2 border-l border-charcoal-light pl-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.inferEdgeCases}
              onChange={(e) => onSettingsChange(s => ({ ...s, inferEdgeCases: e.target.checked }))}
              className="w-3 h-3 text-vivid-purple bg-charcoal-light border-soft-gray rounded focus:ring-vivid-purple focus:ring-2"
              disabled={disabled}
            />
            <span className="text-xs text-soft-gray">Infer edge cases</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.includeAdvancedCriteria}
              onChange={(e) => onSettingsChange(s => ({ ...s, includeAdvancedCriteria: e.target.checked }))}
              className="w-3 h-3 text-vivid-purple bg-charcoal-light border-soft-gray rounded focus:ring-vivid-purple focus:ring-2"
              disabled={disabled}
            />
            <span className="text-xs text-soft-gray">Include advanced acceptance criteria</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.expandAllComponents}
              onChange={(e) => onSettingsChange(s => ({ ...s, expandAllComponents: e.target.checked }))}
              className="w-3 h-3 text-vivid-purple bg-charcoal-light border-soft-gray rounded focus:ring-vivid-purple focus:ring-2"
              disabled={disabled}
            />
            <span className="text-xs text-soft-gray">Expand to all visible UI components</span>
          </label>
        </div>
      </details>
    </div>
  )
}
