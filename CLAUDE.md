# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Since this is a TypeScript package without a build step:
```bash
# Install dependencies (run from monorepo root)
npm install

# Type check this package specifically
cd packages/crud && npx tsc --noEmit

# Type check all packages (from root)
npm run typecheck
```

## Package Architecture

This is the core CRUD abstraction package. It provides the unified interface, backend adapters, and framework integrations for data operations. The package uses TypeScript source files directly.

### Module Structure

**Core Interface** (`src/core.ts`):
-   Defines the generic `CRUD<Readable, Writable>` interface.
-   Defines props-based operation types: `FindProps`, `CreateProps<T>`, `UpdateProps<T>`, `RemoveProps`, `ListProps<T>`.
-   Defines the MongoDB-style query syntax with operators (`$gt`, `$lt`, `$in`, etc.) and filters (`$sort`, `$limit`, etc.).

**Backend Implementations (Submodules)**:
-   **`src/yaml/`**: A file-based backend using YAML files. Ideal for development. Exports `yamlCRUD`.
-   **`src/firestore/`**: A backend for Google Firestore. Exports `firestoreCRUD`.
-   **`src/airtable/`**: A backend for Airtable. Exports `airtableCRUD`. It uses the `@asasvirtuais/airtable` SDK.

**Framework Integrations (Submodules)**:
-   **`src/react/`**: The React integration layer.
    -   Exports a `database()` factory function that creates a full suite of typed hooks and components (`DatabaseProvider`, `useTable`, `CreateForm`, `UpdateForm`, etc.).
    -   It is built upon the generic hooks from the `@asasvirtuais/react` package.
-   **`src/next/`**: The Next.js integration layer.
    -   Exports `createDynamicRoute()` for creating catch-all API route handlers that serve the CRUD operations over REST.

**Client Communication**:
-   **`src/fetcher.ts`**: Exports a `fetcher` function, which is a `CRUD` implementation that communicates over HTTP. It's used by the React integration on the client-side to talk to the Next.js API routes.

### Key Implementation Patterns

-   **Submodule Exports**: The package uses the `exports` field in `package.json` to expose its different modules (e.g., `@asasvirtuais/crud/react`, `@asasvirtuais/crud/yaml`).
-   **Factory Functions**: Backends and the React integration are initialized via factory functions (`yamlCRUD(...)`, `database(...)`) to allow for configuration.
-   **Type Safety with Zod**: The React integration relies on Zod schemas passed to the `database` factory to provide strong type safety for all hooks and form components.

### Working with the Code

-   **Adding a Backend**: To add a new backend, create a new directory in `src/`, implement the `CRUD` interface, and export it as a factory function. Then, add it to the `exports` map in `package.json`.
-   **Modifying React Components**: The React components are in `src/react/index.tsx`. They are designed to be generic and derive all their type information from the Zod schemas provided to the `database` factory.
-   **Type Safety is Paramount**: Avoid using `any`. Rely on the generics (`Readable`, `Writable`) and Zod schema inference (`z.infer<...>`) to maintain type safety.

### Testing Strategy

There are currently no automated tests. If adding tests, consider the following:
-   Unit test each backend implementation separately, mocking the underlying service (e.g., filesystem for YAML, Firestore SDK).
-   Test the query logic in each backend to ensure operators work as expected.
-   Add tests for the React hooks and form components, likely using a testing library like `@testing-library/react`.