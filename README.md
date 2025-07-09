# @asasvirtuais/crud

Core CRUD interface and utilities for building type-safe data operations across different backends. This package is the heart of the architecture, providing the contracts and tools for data management.

## Installation

```bash
npm install @asasvirtuais/crud
```

## Core Concepts

### The CRUD Interface

The central piece is the `CRUD` interface, a generic contract that all data backends implement.

```typescript
// Located in: src/core.ts
interface CRUD<Readable = any, Writable = Readable> {
  find   (props: FindProps            ): Promise<Readable>
  create (props: CreateProps<Writable>): Promise<Readable>
  update (props: UpdateProps<Writable>): Promise<Readable>
  remove (props: RemoveProps          ): Promise<Readable>
  list   (props: ListProps<Readable>  ): Promise<Readable[]>
}
```

### Props-based Operations

All operations use a consistent, props-based object pattern for named arguments.

```typescript
interface FindProps    { table: string; id: string }
interface CreateProps  { table: string; data: Writable }
interface UpdateProps  { table: string; id: string; data: Partial<Writable> }
interface RemoveProps  { table: string; id: string }
interface ListProps    { table: string; query?: Query<Readable> }
```

## Query System

A type-safe, MongoDB-style query syntax is used for all `list` operations.

- **Equality**: `{ name: 'John' }`
- **Comparison**: `{ age: { $gte: 18, $lt: 65 } }`
- **Array**: `{ status: { $in: ['active', 'pending'] } }`
- **Logical**: `{ $or: [{...}, {...}] }`
- **Filters**: `{ $limit: 10, $skip: 20, $sort: { createdAt: -1 } }`
- **Projection**: `{ $select: ['id', 'name'] }`

## Backend Implementations

This package provides several backend implementations, each exported from its own submodule.

### YAML Backend (`@asasvirtuais/crud/yaml`)

File-based storage for development and prototyping.

```typescript
import { yamlCRUD } from '@asasvirtuais/crud/yaml'

const crud = yamlCRUD({ 
  databasePath: './data' // Directory for {table}/{id}.yaml files
})
```

### Firestore Backend (`@asasvirtuais/crud/firestore`)

Integration with Google Firebase Firestore.

```typescript
import { firestoreCRUD } from '@asasvirtuais/crud/firestore'
import { getFirestore } from 'firebase-admin/firestore'

const crud = firestoreCRUD(getFirestore())
```

### Airtable Backend (`@asasvirtuais/crud/airtable`)

Adapter for the Airtable API.

```typescript
import { airtableCRUD } from '@asasvirtuais/crud/airtable'

const crud = airtableCRUD({
  token: process.env.AIRTABLE_TOKEN!,
  baseId: process.env.AIRTABLE_BASE_ID!
})
```

### Fetcher (HTTP Client)

A generic client for consuming any RESTful API that follows the CRUD conventions.

```typescript
import { fetcher } from '@asasvirtuais/crud'

const crud = fetcher({ 
  baseUrl: 'https://api.example.com/v1',
  headers: { 'Authorization': 'Bearer token' }
})
```

## React Integration (`@asasvirtuais/crud/react`)

The `@asasvirtuais/crud/react` submodule provides a powerful factory function called `database` to create a full suite of type-safe hooks and components for your application.

### 1. Create the Database Instance

You define your Zod schemas and pass them along with a CRUD implementation to the `database` function.

```typescript
// in app/data/react.tsx
import { database } from '@asasvirtuais/crud/react'
import { fetcher } from '@asasvirtuais/crud'
import { schema } from './schema' // Your Zod schemas

export const {
  DatabaseProvider,
  useTable,
  CreateForm,
  UpdateForm,
  FilterForm,
  // ...and more
} = database(schema, fetcher({ baseUrl: '/api/v1' }))
```

### 2. Provide the Context

Wrap your application or component tree with the `DatabaseProvider`.

```typescript
// in app/data/provider.tsx
'use client'
import { DatabaseProvider, useTableProvider } from './react'

export default function DataProvider({ children }) {
    // useTableProvider initializes the state for a specific table
    const todos = useTableProvider({ table: 'todos' })

    return (
        <DatabaseProvider todos={todos}>
            {children}
        </DatabaseProvider>
    )
}
```

### 3. Use Hooks and Forms in Components

Now you can use the generated hooks and components throughout your app.

#### Traditional Usage with Separate Components

```typescript
// in app/page.tsx
import { useTable, CreateForm, UpdateForm, useFields, useForm } from './data/react'

function TodosPage() {
  const { array: todos, list } = useTable('todos')

  useEffect(() => {
    list.trigger({}) // Load all todos on mount
  }, [])

  return (
    <div>
      {/* Create Form */}
      <CreateForm table="todos">
        <CreateTodoForm />
      </CreateForm>

      {/* Todo List */}
      {todos.map(todo => (
        <UpdateForm key={todo.id} table="todos" id={todo.id} defaults={todo}>
          <TodoItem todo={todo} />
        </UpdateForm>
      ))}
    </div>
  )
}

function CreateTodoForm() {
  const { fields, setField } = useFields<Todo.Writable>()
  const { submit, loading } = useForm()
  
  return (
    <form onSubmit={submit}>
      <input 
        value={fields.title || ''}
        onChange={e => setField('title', e.target.value)}
        placeholder="New Todo"
      />
      <button type="submit" disabled={loading}>Add</button>
    </form>
  )
}
```

#### Render Props Pattern (Function as Children)

All form components (`CreateForm`, `UpdateForm`, `FilterForm`) support render props for more concise usage:

```typescript
// in app/page.tsx  
import { useTable, CreateForm, UpdateForm, FilterForm } from './data/react'

function TodosPage() {
  const { array: todos, list } = useTable('todos')

  useEffect(() => {
    list.trigger({})
  }, [])

  return (
    <div>
      {/* Filter Form with render props */}
      <FilterForm table="todos" onSuccess={(results) => console.log(results)}>
        {({ fields, setField, submit, loading }) => (
          <form onSubmit={submit}>
            <input 
              value={fields.query?.title || ''}
              onChange={e => setField('query', { ...fields.query, title: e.target.value })}
              placeholder="Search todos..."
            />
            <button type="submit" disabled={loading}>Search</button>
          </form>
        )}
      </FilterForm>

      {/* Create Form with render props */}
      <CreateForm table="todos">
        {({ fields, setField, submit, loading, error }) => (
          <form onSubmit={submit}>
            <input 
              value={fields.title || ''}
              onChange={e => setField('title', e.target.value)}
              placeholder="New Todo"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Todo'}
            </button>
            {error && <p>Error: {error.message}</p>}
          </form>
        )}
      </CreateForm>

      {/* Todo List with inline update forms */}
      {todos.map(todo => (
        <UpdateForm key={todo.id} table="todos" id={todo.id} defaults={todo}>
          {({ fields, setField, submit, loading }) => (
            <div>
              <input 
                value={fields.title || ''}
                onChange={e => setField('title', e.target.value)}
                onBlur={submit}
              />
              <input 
                type="checkbox"
                checked={fields.completed || false}
                onChange={e => {
                  setField('completed', e.target.checked)
                  submit()
                }}
              />
              {loading && <span>Saving...</span>}
            </div>
          )}
        </UpdateForm>
      ))}
    </div>
  )
}
```

#### Advanced Example: Multi-step Form with Validation

```typescript
import { CreateForm } from './data/react'
import { z } from 'zod'

// Define schema with validation
const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18),
  preferences: z.object({
    newsletter: z.boolean(),
    theme: z.enum(['light', 'dark'])
  })
})

function UserRegistration() {
  const [step, setStep] = useState(1)

  return (
    <CreateForm 
      table="users" 
      defaults={{ preferences: { newsletter: false, theme: 'light' } }}
      onSuccess={(user) => {
        console.log('User created:', user)
        // Redirect or show success message
      }}
    >
      {({ fields, setField, submit, loading, error }) => (
        <form onSubmit={(e) => {
          e.preventDefault()
          // Validate current step before proceeding
          try {
            if (step === 1) {
              UserSchema.pick({ name: true, email: true }).parse(fields)
              setStep(2)
            } else {
              submit(e)
            }
          } catch (validationError) {
            console.error('Validation failed:', validationError)
          }
        }}>
          {step === 1 ? (
            <>
              <h2>Step 1: Basic Info</h2>
              <input 
                value={fields.name || ''}
                onChange={e => setField('name', e.target.value)}
                placeholder="Name"
              />
              <input 
                value={fields.email || ''}
                onChange={e => setField('email', e.target.value)}
                placeholder="Email"
              />
              <button type="submit">Next</button>
            </>
          ) : (
            <>
              <h2>Step 2: Preferences</h2>
              <input 
                type="number"
                value={fields.age || ''}
                onChange={e => setField('age', parseInt(e.target.value))}
                placeholder="Age"
              />
              <label>
                <input 
                  type="checkbox"
                  checked={fields.preferences?.newsletter || false}
                  onChange={e => setField('preferences', {
                    ...fields.preferences,
                    newsletter: e.target.checked
                  })}
                />
                Subscribe to newsletter
              </label>
              <select 
                value={fields.preferences?.theme || 'light'}
                onChange={e => setField('preferences', {
                  ...fields.preferences,
                  theme: e.target.value as 'light' | 'dark'
                })}
              >
                <option value="light">Light Theme</option>
                <option value="dark">Dark Theme</option>
              </select>
              <button type="button" onClick={() => setStep(1)}>Back</button>
              <button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </>
          )}
          {error && <p>Error: {error.message}</p>}
        </form>
      )}
    </CreateForm>
  )
}
```

## Next.js Integration (`@asasvirtuais/crud/next`)

Create a dynamic, catch-all API route with a single function.

```typescript
// app/api/v1/[...params]/route.ts
import { createDynamicRoute } from '@asasvirtuais/crud/next'
import { yamlCRUD } from '@asasvirtuais/crud/yaml'

const crud = yamlCRUD({ databasePath: './database' })
const handler = createDynamicRoute(crud)

export { 
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE
}
```

This creates RESTful endpoints for all tables defined in your backend.

## API Reference

### Core Types

-   `CRUD<Readable, Writable>`: The main interface.
-   `Query<T>`: The query type with operators.

### Backend Factories

-   `yamlCRUD(config)`
-   `firestoreCRUD(db)`
-   `airtableCRUD(config)`
-   `fetcher(config)`

### React Factory

-   `database(schema, crud)`: Returns an object with the following:
    -   **Providers**: `DatabaseProvider`, `SingleProvider`
    -   **Hooks**: `useDatabase`, `useTable`, `useSingle`, `useCreateForm`, `useUpdateForm`, `useFiltersForm`
    -   **Components**: `CreateForm`, `UpdateForm`, `FilterForm`

## License

MIT