# Design Document

## Overview

This design outlines a comprehensive restructuring of the WhatsApp CRM codebase to follow modern Next.js 14 best practices. The restructuring will establish clear architectural boundaries, improve maintainability, and create a scalable foundation for future development.

## Architecture

### Current Structure Issues
- Mixed component organization (some in folders, some as single files)
- Duplicate type definitions across `lib/api.ts` and `lib/api-client.ts`
- Business logic mixed with data access in API client
- Inconsistent import/export patterns
- No clear service layer abstraction

### Target Architecture
```
src/
├── app/                    # Next.js App Router (unchanged)
├── components/             # Feature-organized React components
│   ├── features/           # Business domain components
│   │   ├── conversations/
│   │   ├── contacts/
│   │   ├── campaigns/
│   │   ├── agentic/
│   │   └── workflows/
│   ├── ui/                 # Shared UI components
│   └── layout/             # Layout components
├── lib/                    # Core application logic
│   ├── types/              # TypeScript type definitions
│   ├── services/           # Business logic and external API clients
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   └── config/             # Configuration and constants
└── supabase/               # Database schema and client (unchanged)
```

## Components and Interfaces

### Component Organization

#### Feature-Based Structure
Components will be organized by business domain rather than technical function:

```
components/
├── features/
│   ├── conversations/
│   │   ├── ConversationList/
│   │   ├── ChatWindow/
│   │   └── index.ts
│   ├── contacts/
│   │   ├── ContactsPanel/
│   │   ├── AddContactModal/
│   │   └── index.ts
│   ├── campaigns/
│   │   ├── CampaignsPanel/
│   │   ├── CampaignCard/
│   │   ├── CreateCampaignModal/
│   │   └── index.ts
│   ├── agentic/
│   │   ├── AgenticDashboard/
│   │   ├── AIAgentsStatus/
│   │   ├── MetricCard/
│   │   └── index.ts
│   └── workflows/
│       ├── N8nIntegration/
│       ├── TriggerManagement/
│       ├── FollowUpRulesPanel/
│       └── index.ts
├── ui/                     # Shared UI components (unchanged)
├── layout/
│   ├── Dashboard/
│   ├── Sidebar/
│   └── index.ts
└── index.ts                # Main barrel export
```

#### Component Structure Pattern
Each feature component follows this pattern:
```
ComponentName/
├── index.tsx               # Main component export
├── ComponentName.tsx       # Component implementation
├── hooks.ts               # Component-specific hooks (if needed)
├── types.ts               # Component-specific types (if needed)
└── utils.ts               # Component-specific utilities (if needed)
```

### Service Layer Architecture

#### Service Interfaces
```typescript
// Base service interface
interface BaseService<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Domain-specific services
interface ContactsService extends BaseService<Contact> {
  findByPhone(phone: string): Promise<Contact | null>;
  addTags(id: string, tags: string[]): Promise<Contact>;
}
```

#### Service Implementation Structure
```
lib/services/
├── base/
│   ├── BaseService.ts      # Abstract base service
│   └── index.ts
├── contacts/
│   ├── ContactsService.ts
│   ├── types.ts
│   └── index.ts
├── conversations/
│   ├── ConversationsService.ts
│   ├── types.ts
│   └── index.ts
├── campaigns/
│   ├── CampaignsService.ts
│   ├── types.ts
│   └── index.ts
├── external/
│   ├── SupabaseClient.ts
│   ├── WhatsAppService.ts
│   ├── GeminiService.ts
│   └── index.ts
└── index.ts                # Service registry
```

## Data Models

### Type Organization
All TypeScript types will be centralized and organized by domain:

```
lib/types/
├── api/
│   ├── contacts.ts
│   ├── conversations.ts
│   ├── messages.ts
│   ├── campaigns.ts
│   └── index.ts
├── ui/
│   ├── components.ts
│   ├── forms.ts
│   └── index.ts
├── services/
│   ├── base.ts
│   ├── external.ts
│   └── index.ts
└── index.ts                # Main type exports
```

### Type Definitions Structure
```typescript
// lib/types/api/contacts.ts
export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags: string[];
  metadata: Record<string, any>;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactRequest {
  phone_number: string;
  name: string;
  email?: string;
  company?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  source: string;
}

export interface UpdateContactRequest {
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*
Property 1: Feature-based component organization
*For any* component in the system, it should be located in a directory that corresponds to its business domain (conversations, contacts, campaigns, agentic, workflows) rather than its technical function
**Validates: Requirements 1.1, 3.1**

Property 2: Consistent component directory structure
*For any* component directory, it should contain an index file that exports the main component and follow PascalCase naming for component files
**Validates: Requirements 1.2, 3.2**

Property 3: Lib directory separation of concerns
*For any* file in the lib directory, it should be located in the appropriate subdirectory (types, services, utils, hooks) based on its purpose and responsibility
**Validates: Requirements 1.3, 2.1**

Property 4: API route logical grouping
*For any* API route, it should be grouped with related endpoints in feature-based directories that reflect business domains
**Validates: Requirements 1.4**

Property 5: Consistent import patterns with barrel exports
*For any* module import, it should use consistent import paths and directories should provide barrel exports through index files
**Validates: Requirements 1.5, 5.1**

Property 6: Service layer single responsibility
*For any* service class, it should handle only one business domain and separate Supabase client logic from business logic
**Validates: Requirements 2.2, 2.3**

Property 7: External integration isolation
*For any* third-party API integration, it should be isolated in dedicated service modules with proper error handling
**Validates: Requirements 2.4, 4.2**

Property 8: State management encapsulation
*For any* data fetching or state management logic, it should be encapsulated in custom hooks rather than directly in components
**Validates: Requirements 2.5**

Property 9: UI component organization
*For any* shared UI component, it should be maintained in the dedicated ui directory with proper exports and co-located related files
**Validates: Requirements 3.3, 3.4**

Property 10: File naming conventions
*For any* file in the system, it should follow PascalCase for component files and camelCase for utility files
**Validates: Requirements 3.5**

Property 11: Service abstraction layers
*For any* database operation, it should be abstracted behind service interfaces rather than direct Supabase calls
**Validates: Requirements 4.1**

Property 12: Configuration centralization
*For any* environment variable or configuration value, it should be centralized in dedicated configuration modules
**Validates: Requirements 4.3**

Property 13: Layer separation
*For any* business logic implementation, it should be separated from data access and presentation layers
**Validates: Requirements 4.4**

Property 14: Consistent error handling
*For any* service layer, it should implement consistent error handling patterns across all operations
**Validates: Requirements 4.5**

Property 15: Type-only imports
*For any* TypeScript type import, it should use type-only imports where appropriate to maintain clear boundaries
**Validates: Requirements 5.2**

Property 16: Logical export grouping
*For any* barrel export file, it should group related exports logically and prevent circular dependencies
**Validates: Requirements 5.3, 5.4**

Property 17: Import ordering consistency
*For any* file with imports, it should follow consistent ordering (external, internal, relative)
**Validates: Requirements 5.5**

Property 18: Strict TypeScript configuration
*For any* TypeScript file, it should be validated against strict TypeScript configuration with comprehensive type checking
**Validates: Requirements 6.1**

Property 19: Comprehensive type definitions
*For any* data model or function, it should have proper TypeScript interfaces and type annotations
**Validates: Requirements 6.2, 6.3**

Property 20: API response type validation
*For any* API response, it should be validated against expected interfaces to ensure type safety
**Validates: Requirements 6.4**

Property 21: External library type definitions
*For any* external library usage, it should have proper type definitions or declarations
**Validates: Requirements 6.5**

## Error Handling

### Service Layer Error Handling
- Standardized error types for different failure scenarios
- Consistent error propagation patterns
- Proper error logging and monitoring
- Graceful degradation for external service failures

### Component Error Boundaries
- React error boundaries for component-level error handling
- Fallback UI components for error states
- Error reporting and user feedback mechanisms

## Testing Strategy

### Dual Testing Approach
The system will use both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing:**
- Test specific component behaviors and edge cases
- Verify service layer functionality with mock data
- Test error handling scenarios
- Integration tests for API endpoints

**Property-Based Testing:**
- Verify structural properties of the codebase organization
- Test that architectural constraints are maintained
- Validate import/export patterns across the codebase
- Ensure type safety properties hold across all modules

**Property-Based Testing Framework:**
- Use **fast-check** for JavaScript/TypeScript property-based testing
- Configure each property test to run a minimum of 100 iterations
- Tag each property test with comments referencing design document properties
- Use format: '**Feature: code-structure-cleanup, Property {number}: {property_text}**'

**Testing Requirements:**
- Each correctness property must be implemented by a single property-based test
- Tests must validate real code structure, not mocked implementations
- Property tests should generate diverse inputs to validate structural constraints
- Unit tests complement property tests by testing specific examples and edge cases