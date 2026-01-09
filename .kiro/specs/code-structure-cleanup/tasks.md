# Implementation Plan

- [x] 1. Set up new directory structure and configuration
  - Create new directory structure following the target architecture
  - Set up TypeScript configuration for strict type checking
  - Create barrel export index files for each directory
  - _Requirements: 1.3, 6.1_

- [x] 1.1 Write property test for directory structure validation
  - **Property 3: Lib directory separation of concerns**
  - **Validates: Requirements 1.3, 2.1**

- [x] 1.2 Write property test for TypeScript configuration
  - **Property 18: Strict TypeScript configuration**
  - **Validates: Requirements 6.1**

- [x] 2. Centralize and reorganize type definitions
  - Create centralized type definitions in lib/types directory
  - Migrate types from lib/api.ts and lib/api-client.ts to domain-specific type files
  - Remove duplicate type definitions
  - Create comprehensive interfaces for all data models
  - _Requirements: 2.1, 6.2_

- [ ]* 2.1 Write property test for type centralization
  - **Property 3: Lib directory separation of concerns**
  - **Validates: Requirements 2.1**

- [ ]* 2.2 Write property test for comprehensive type definitions
  - **Property 19: Comprehensive type definitions**
  - **Validates: Requirements 6.2, 6.3**

- [x] 3. Create service layer abstraction
  - Implement base service interface and abstract class
  - Create domain-specific services (ContactsService, ConversationsService, etc.)
  - Abstract Supabase client operations behind service interfaces
  - Implement consistent error handling across all services
  - _Requirements: 2.2, 2.3, 4.1, 4.5_

- [ ]* 3.1 Write property test for service single responsibility
  - **Property 6: Service layer single responsibility**
  - **Validates: Requirements 2.2, 2.3**

- [ ]* 3.2 Write property test for service abstraction
  - **Property 11: Service abstraction layers**
  - **Validates: Requirements 4.1**

- [ ]* 3.3 Write property test for consistent error handling
  - **Property 14: Consistent error handling**
  - **Validates: Requirements 4.5**

- [x] 4. Move files from lib root to appropriate subdirectories
  - Move lib/api.ts types to lib/types/api/ files
  - Move lib/campaign-orchestrator.ts to lib/services/campaigns/
  - Move lib/instagram-orchestrator.ts to lib/services/external/
  - Move lib/whatsapp.ts and lib/whatsapp-cloud.ts to lib/services/external/
  - Move lib/gemini.ts to lib/services/external/
  - Move lib/utils.ts functions to lib/utils/ directory
  - Update all import statements to use new paths
  - _Requirements: 1.3, 2.1, 2.4_

- [ ]* 4.1 Write property test for external integration isolation
  - **Property 7: External integration isolation**
  - **Validates: Requirements 2.4, 4.2**

- [ ]* 4.2 Write property test for configuration centralization
  - **Property 12: Configuration centralization**
  - **Validates: Requirements 4.3**

- [x] 5. Implement domain-specific service classes
  - Create ContactsService with Supabase operations
  - Create ConversationsService with message handling
  - Create CampaignsService with orchestration logic
  - Implement proper error handling for all services
  - _Requirements: 2.2, 2.3, 4.1, 4.5_

- [ ]* 5.1 Write property test for service single responsibility
  - **Property 6: Service layer single responsibility**
  - **Validates: Requirements 2.2, 2.3**

- [ ]* 5.2 Write property test for service abstraction
  - **Property 11: Service abstraction layers**
  - **Validates: Requirements 4.1**

- [ ]* 5.3 Write property test for consistent error handling
  - **Property 14: Consistent error handling**
  - **Validates: Requirements 4.5**

- [x] 6. Restructure components into feature-based organization
  - Move AgenticDashboard components to components/features/agentic/
  - Move Campaigns components to components/features/campaigns/
  - Move ChatWindow and ConversationList to components/features/conversations/
  - Move ContactsPanel and AddContactModal to components/features/contacts/
  - Move N8nIntegration, TriggerManagement, FollowUpRulesPanel to components/features/workflows/
  - Update component imports and barrel exports
  - _Requirements: 1.1, 3.1, 3.2, 3.5_

- [ ]* 6.1 Write property test for feature-based component organization
  - **Property 1: Feature-based component organization**
  - **Validates: Requirements 1.1, 3.1**

- [ ]* 6.2 Write property test for component directory structure
  - **Property 2: Consistent component directory structure**
  - **Validates: Requirements 1.2, 3.2**

- [ ]* 6.3 Write property test for file naming conventions
  - **Property 10: File naming conventions**
  - **Validates: Requirements 3.5**

- [x] 7. Reorganize shared UI components and layout components
  - Move Dashboard.tsx to components/layout/
  - Ensure proper barrel exports for all UI components
  - Co-locate related component files, hooks, and utilities
  - _Requirements: 3.3, 3.4_

- [ ]* 7.1 Write property test for UI component organization
  - **Property 9: UI component organization**
  - **Validates: Requirements 3.3, 3.4**

- [x] 8. Update custom hooks to use new service layer
  - Refactor existing hooks to use new service abstractions
  - Ensure hooks encapsulate data fetching and state management logic
  - Update hooks to import from new service locations
  - _Requirements: 2.5_

- [ ]* 8.1 Write property test for state management encapsulation
  - **Property 8: State management encapsulation**
  - **Validates: Requirements 2.5**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Update import/export patterns throughout codebase
  - Update all import statements to use new paths
  - Implement type-only imports where appropriate
  - Ensure consistent import ordering (external, internal, relative)
  - Remove old lib/api.ts and lib/api-client.ts files
  - _Requirements: 1.5, 5.1, 5.2, 5.5_

- [ ]* 10.1 Write property test for import patterns and barrel exports
  - **Property 5: Consistent import patterns with barrel exports**
  - **Validates: Requirements 1.5, 5.1**

- [ ]* 10.2 Write property test for type-only imports
  - **Property 15: Type-only imports**
  - **Validates: Requirements 5.2**

- [ ]* 10.3 Write property test for import ordering
  - **Property 17: Import ordering consistency**
  - **Validates: Requirements 5.5**

- [x] 11. Organize API routes into logical feature groups
  - Group related API endpoints into feature-based directories
  - Ensure consistent patterns across all API routes
  - _Requirements: 1.4_

- [ ]* 11.1 Write property test for API route organization
  - **Property 4: API route logical grouping**
  - **Validates: Requirements 1.4**

- [x] 12. Implement layer separation and business logic organization
  - Separate business logic from data access and presentation layers
  - Ensure no circular dependencies between modules
  - Group related exports logically in barrel files
  - _Requirements: 4.4, 5.3, 5.4_

- [ ]* 12.1 Write property test for layer separation
  - **Property 13: Layer separation**
  - **Validates: Requirements 4.4**

- [ ]* 12.2 Write property test for logical export grouping
  - **Property 16: Logical export grouping**
  - **Validates: Requirements 5.3, 5.4**

- [x] 13. Add comprehensive type validation for API responses
  - Implement type validation for all API responses
  - Ensure external library type definitions are proper
  - Add runtime type checking where necessary
  - _Requirements: 6.4, 6.5_

- [ ]* 13.1 Write property test for API response type validation
  - **Property 20: API response type validation**
  - **Validates: Requirements 6.4**

- [ ]* 13.2 Write property test for external library type definitions
  - **Property 21: External library type definitions**
  - **Validates: Requirements 6.5**

- [x] 14. Final cleanup and validation
  - Remove old unused files and directories
  - Update all references to moved files
  - Verify all imports are working correctly
  - Run full type checking and linting
  - _Requirements: All_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.