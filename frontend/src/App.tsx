import { useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { TypeAnimation } from 'react-type-animation'
import { StoryRoom } from '@/components/StoryRoom/StoryRoom'
import { ModeToggle, type GenerateMode } from '@/components/StoryRoom/ModeToggle'
import { QuickGenerateMode } from '@/components/QuickGenerate/QuickGenerateMode'

function App() {
  const [generateMode, setGenerateMode] = useState<GenerateMode>('story-room')

  return (
    <div className="min-h-screen bg-deep-charcoal text-pure-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-pure-white" aria-label="AI User Story Generator">
            <TypeAnimation
              sequence={[
                'AI User Story Generator', 3000,
                'Built for Agile Teams', 3500,
                'Turn Chaos Into Clarity', 4000,
              ]}
              wrapper="span"
              speed={25}
              repeat={0}
              cursor={true}
            />
          </h1>
          <p className="text-soft-gray">Transform meeting notes and requirements into structured user stories with AI.</p>
        </div>

        <div className="flex justify-center mb-6">
          <ModeToggle
            mode={generateMode}
            onChange={setGenerateMode}
            disabled={false}
          />
        </div>

        {generateMode === 'story-room' && <StoryRoom />}
        {generateMode === 'quick' && <QuickGenerateMode />}

        <footer className="mt-16 pt-8 border-t border-charcoal-light text-center space-y-3">
          <p className="text-soft-gray text-sm">
            Enjoying this tool? Consider{' '}
            <a
              href="https://buymeacoffee.com/shainapauley"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-purple hover:text-purple-300 transition-colors inline-flex items-center gap-1"
            >
              buying me a coffee ☕
            </a>
            {' '}to keep it running
          </p>
          <p className="text-soft-gray text-sm">
            © 2025{' '}
            <a
              href="https://www.deeperpls.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-purple hover:text-purple-300 transition-colors"
            >
              Shaina Pauley
            </a>
            {' • '}
            <a
              href="https://github.com/Surfrrosa/prompt2story"
              target="_blank"
              rel="noopener noreferrer"
              className="text-soft-gray hover:text-pure-white transition-colors"
            >
              Open Source
            </a>
            {' • '}
            <a
              href="https://github.com/Surfrrosa/prompt2story/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-soft-gray hover:text-pure-white transition-colors"
            >
              MIT License
            </a>
          </p>
        </footer>
      </div>
      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
