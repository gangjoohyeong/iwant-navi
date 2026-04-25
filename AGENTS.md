# Next.js Project Template - AI Development Guide

<system_directive>
You are an AI agent developing features for this Next.js 16 project.
You MUST strictly adhere to the following architectural boundaries, code conventions, and safety rules.
</system_directive>

<project_stack>
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI (shadcn/ui)
- **State Management**: TanStack React Query 5
- **Form Management**: React Hook Form + Zod
- **i18n**: next-intl
- **Overlays**: overlay-kit
- **Logging**: pino
- **Package Manager**: pnpm
</project_stack>

<architecture_rules>
- **`app/` (Page Layer)**: Assembles pages by combining feature components.
- **`feature/` (Feature Layer)**: Domain logic, UI composition, and React Query hooks.
- **`components/` (UI Layer)**: Atomic, reusable UI components.
- **`gateway/` (API Layer)**: External API communication.
- **Shared Infrastructure**:
  - `hook/`: Shared React Hooks
  - `lib/`: External library configurations
  - `provider/`: Global state providers
  - `utils/`: Utility functions
  - `types/`: Shared TypeScript definitions

**Data Flow Constraint:**
`app/` → `feature/` → `gateway/` → External API
</architecture_rules>

<code_conventions>
- **Strict Mode**: Use TypeScript strict mode.
- **Components**: Use only functional components and hooks (NO class components).
- **Imports**: Use absolute imports with `@/` prefix.
- **Async**: Use `async/await` (NO Promise chaining).
- **Error Handling**: Handle errors via try-catch or React Query's `onError`.
</code_conventions>

<naming_conventions>
- **Directory**: `kebab-case` (e.g., `ai-search`)
- **Component File**: `kebab-case` + environment suffix (`.client.tsx`, `.server.tsx`)
- **Component Function**: `PascalCase`
- **Hook File/Function**: `use-kebab.ts` / `useCamelCase`
- **Utility Function**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Gateway File**: `get.ts`, `upsert.ts`, `delete.ts`
- **Query Key Factory**: `{domain}-query-key-factory.ts`
</naming_conventions>

<security_and_api_rules>
- **No Direct Fetching**: UI Components MUST NOT fetch directly. All API calls MUST go through `src/gateway/` using Server Actions (`'use server'`).
- **Standard Response**: APIs MUST return the standard format: `{ code: number, status: string, message: string, result: unknown }`.
- **Validation**: Validate ALL environment variables and user inputs using Zod schemas.
</security_and_api_rules>

<feature_development_workflow>
1. **Gateway**: Create `get.ts`, `upsert.ts`, `delete.ts` in `src/gateway/{domain}/{feature}/` (MUST use `'use server'`).
2. **Query Factory**: Create `{domain}-query-key-factory.ts` in `src/feature/{domain}/queries/`.
3. **Query Hook**: Create `{domain}-query.ts` wrapping `useQuery` or `useMutation`.
4. **Feature Component**: Create `.client.tsx` or `.server.tsx` in `src/feature/{domain}/`.
5. **Page**: Assemble the components in `src/app/{route}/page.tsx`.
</feature_development_workflow>

<code_examples>
**React Query Factory Example:**
```typescript
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { getAllPosts } from '@/gateway/board/posts';

export const boardQueryKeyFactory = createQueryKeys('board', {
    post: { queryKey: ['post'], queryFn: getAllPosts },
});
```

**Gateway Server Action Example:**
```typescript
'use server';
import { api, ResponseBody } from '@/utils/api';

export const getAllPosts = async (): Promise<ResponseBody> => {
    return await api.get('https://example.com/api/posts');
};
```
</code_examples>

<common_issues_and_solutions>
- **Missing `'use client'` error**: Add `'use client'` directive to the top of the file.
- **Cannot call Gateway fn from client**: Wrap the Server Action with a React Query hook.
- **Hydration mismatch**: Move client-only rendering logic inside `useEffect`.
- **Direct URL access allowed after logout**: Use `auth()` directly in middleware instead of just checking for cookie presence.
</common_issues_and_solutions>
