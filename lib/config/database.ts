// Database configuration
export const databaseConfig = {
  // Connection settings
  connection: {
    maxConnections: 10,
    connectionTimeout: 30000,
    idleTimeout: 600000,
  },

  // Query settings
  query: {
    defaultPageSize: 20,
    maxPageSize: 100,
    timeout: 30000,
  },

  // Table names
  tables: {
    contacts: 'contacts',
    campaigns: 'campaigns',
  },

  // RLS policies
  rls: {
    enabled: true,
    bypassForServiceRole: true,
  },
} as const;