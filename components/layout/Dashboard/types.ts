export type Tab = 'agentic' | 'intelligent' | 'campaigns' | 'integrations';

export interface TabConfig {
  id: Tab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}