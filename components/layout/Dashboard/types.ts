export type Tab = 'agentic' | 'intelligent' | 'contacts' | 'campaigns' | 'shopify' | 'integrations';

export interface TabConfig {
  id: Tab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}