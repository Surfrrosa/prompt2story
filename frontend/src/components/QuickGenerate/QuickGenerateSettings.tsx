import { Settings, ChevronRight } from '@/components/icons'

interface QuickGenerateSettingsProps {
  includeMetadata: boolean
  inferEdgeCases: boolean
  includeAdvancedCriteria: boolean
  expandAllComponents: boolean
  disabled: boolean
  onIncludeMetadataChange: (checked: boolean) => void
  onInferEdgeCasesChange: (checked: boolean) => void
  onIncludeAdvancedCriteriaChange: (checked: boolean) => void
  onExpandAllComponentsChange: (checked: boolean) => void
}

export function QuickGenerateSettings({
  includeMetadata,
  inferEdgeCases,
  includeAdvancedCriteria,
  expandAllComponents,
  disabled,
  onIncludeMetadataChange,
  onInferEdgeCasesChange,
  onIncludeAdvancedCriteriaChange,
  onExpandAllComponentsChange,
}: QuickGenerateSettingsProps) {
  return (
    <div className="space-y-3 p-3 bg-charcoal-light rounded-lg border border-charcoal-light">
      <div className="flex items-center space-x-3">
        <Settings className="h-4 w-4 text-soft-gray" />
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeMetadata}
            onChange={(e) => onIncludeMetadataChange(e.target.checked)}
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
              checked={inferEdgeCases}
              onChange={(e) => onInferEdgeCasesChange(e.target.checked)}
              className="w-3 h-3 text-vivid-purple bg-charcoal-light border-soft-gray rounded focus:ring-vivid-purple focus:ring-2"
              disabled={disabled}
            />
            <span className="text-xs text-soft-gray">Infer edge cases</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAdvancedCriteria}
              onChange={(e) => onIncludeAdvancedCriteriaChange(e.target.checked)}
              className="w-3 h-3 text-vivid-purple bg-charcoal-light border-soft-gray rounded focus:ring-vivid-purple focus:ring-2"
              disabled={disabled}
            />
            <span className="text-xs text-soft-gray">Include advanced acceptance criteria</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={expandAllComponents}
              onChange={(e) => onExpandAllComponentsChange(e.target.checked)}
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
