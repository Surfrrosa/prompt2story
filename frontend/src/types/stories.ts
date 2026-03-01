export interface Metadata {
  priority: 'Low' | 'Medium' | 'High'
  type: 'Feature' | 'Bug' | 'Chore' | 'Enhancement'
  component: string
  effort: string
  persona: 'End User' | 'Admin' | 'Support Agent' | 'Engineer' | 'Designer' | 'QA' | 'Customer' | 'Other'
  persona_other?: string
}

export interface UserStory {
  title: string
  story: string
  acceptance_criteria: string[]
  metadata?: Metadata
}

export interface GenerationResponse {
  user_stories: UserStory[]
  edge_cases: string[]
}

export interface FeedbackState {
  rating: 'up' | 'down' | null
  text: string
  expanded: boolean
  submitted: boolean
}
