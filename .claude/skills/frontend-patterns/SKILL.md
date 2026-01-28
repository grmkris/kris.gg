---
name: frontend-patterns
description: React patterns for data fetching, forms, mutations, and state management with ORPC + React Query. Use when building pages, forms, or data components.
globs:
  - src/app/**/*.tsx
  - src/components/**/*.tsx
alwaysApply: false
---

# Frontend Patterns

Use these patterns when building React components that interact with the API.

## When to Use

- Creating pages that fetch data
- Building forms that mutate data
- Implementing optimistic updates
- Managing loading/error states

## Key Files

- `src/utils/orpc.ts` - ORPC client and query utilities
- `src/components/providers.tsx` - QueryClient provider setup
- `src/components/ui/` - UI component library

## Pattern Files

- [data-fetching.md](data-fetching.md) - Query and mutation patterns
- [forms.md](forms.md) - Form patterns with validation
- [optimistic.md](optimistic.md) - Optimistic update patterns
