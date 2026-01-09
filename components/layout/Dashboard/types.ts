export type Tab = 'agentic' | 'conversations' | 'contacts' | 'campaigns' | 'follow-ups' | 'triggers' | 'workflows' | 'instagram';

export interface TabConfig {
  id: Tab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}