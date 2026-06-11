export type Tab = 'agentic' | 'contacts' | 'campaigns' | 'workflows' | 'instagram' | 'shopify';

export interface TabConfig {
  id: Tab;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}