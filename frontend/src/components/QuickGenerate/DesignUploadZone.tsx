import { Upload, Image, FileText, X } from '@/components/icons'

interface DesignUploadZoneProps {
  isDragOver: boolean
  isProcessingFile: boolean
  processingMessage: string
  uploadedFile: File | null
  filePreview: string | null
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export function DesignUploadZone({
  isDragOver,
  isProcessingFile,
  processingMessage,
  uploadedFile,
  filePreview,
  onFileUpload,
  onClearFile,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: DesignUploadZoneProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-soft-gray mb-2">
          Upload File (Images or Documents)
        </label>

        {!isProcessingFile ? (
          <div
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`relative w-full min-h-[200px] border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out cursor-pointer group ${
              isDragOver
                ? 'border-vivid-purple bg-vivid-purple/10 scale-[1.02]'
                : 'border-charcoal-light bg-charcoal-lighter/50 hover:border-soft-gray hover:bg-charcoal-lighter/70'
            }`}
          >
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md"
              onChange={onFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className={`mb-4 transition-all duration-300 ${isDragOver ? 'scale-110' : 'group-hover:scale-105'}`}>
                <Upload className={`w-12 h-12 mx-auto transition-colors duration-300 ${
                  isDragOver ? 'text-vivid-purple' : 'text-soft-gray group-hover:text-pure-white'
                }`} />
              </div>

              <div className="space-y-2">
                <p className={`text-lg font-medium transition-colors duration-300 ${
                  isDragOver ? 'text-pure-white' : 'text-soft-gray group-hover:text-pure-white'
                }`}>
                  {isDragOver ? 'Drop your file here' : 'Drag & drop your file'}
                </p>

                <p className="text-sm text-soft-gray">
                  or <span className="text-vivid-purple font-medium hover:text-vivid-purple cursor-pointer">click to browse</span>
                </p>

                <div className="flex items-center justify-center space-x-4 mt-4">
                  <div className="flex items-center space-x-1">
                    <Image className="w-4 h-4 text-soft-gray" />
                    <span className="text-xs text-soft-gray">PNG, JPG, WEBP, GIF</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4 text-soft-gray" />
                    <span className="text-xs text-soft-gray">PDF, TXT, MD</span>
                  </div>
                  <span className="text-xs text-soft-gray">• Max 25MB</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full min-h-[200px] bg-deep-charcoal rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-vivid-purple rounded-full pulse-dot"></div>
                <div className="w-2 h-2 bg-vivid-purple rounded-full pulse-dot"></div>
                <div className="w-2 h-2 bg-vivid-purple rounded-full pulse-dot"></div>
              </div>
              <span className="text-lg font-semibold text-vivid-purple">
                {processingMessage}
              </span>
            </div>
          </div>
        )}
      </div>

      {uploadedFile && (
        <div className="p-4 bg-charcoal-light rounded-lg border border-charcoal-light">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-soft-gray">{uploadedFile.name}</span>
            <button
              onClick={onClearFile}
              className="text-soft-gray hover:text-red-400 transition-colors"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {filePreview && (
            <img
              src={filePreview}
              alt="Design preview"
              className="max-w-full h-48 object-contain rounded border border-charcoal-light"
            />
          )}
        </div>
      )}
    </div>
  )
}
