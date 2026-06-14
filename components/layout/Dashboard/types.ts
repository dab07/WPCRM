export type Tab = 'agentic' | 'contacts' | 'campaigns' | 'shopify' | 'integrations';

export interface TabConfig {
  id: Tab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}