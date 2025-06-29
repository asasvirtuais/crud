# @asasvirtuais/crud

TypeScript CRUD library with full type safety and pluggable backends.

## Features

- 🔥 **Shared Interface** - Same interface for frontend and backend
- 🔌 **Pluggable Backends** - Switch between fetcher, FeathersJS, or custom implementations
- 📝 **Props-based API** - Clean `{ table, data }` instead of multiple parameters  
- 🎯 **Generic Tables** - Table name as props, not pre-defined
- 🔐 **Full TypeScript** - Complete type safety without runtime overhead

## Installation

```bash
npm install @asasvirtuais/crud
```

## Quick Start

```typescript
import { crud, fetcher } from '@asasvirtuais/crud'

// Setup with fetcher backend
const db = crud(fetcher({ baseUrl: 'https://api.example.com' }))

// Use with any table
const user = await db.create({ 
  table: 'users', 
  data: { name: 'João', email: 'joao@example.com' } 
})

const users = await db.list({ 
  table: 'users', 
  query: { active: true } 
})
```

## Backends

### Fetcher (REST API)

```typescript
import { crud, fetcher } from '@asasvirtuais/crud'

const db = crud(fetcher({
  baseUrl: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' }
}))
```

### FeathersJS

```typescript
import { crud, feathersBackend } from '@asasvirtuais/crud'
import feathers from '@feathersjs/client'

const client = feathers()
const db = crud(feathersBackend({ client }))
```

### Next.js Routes

```typescript
// app/api/v1/[...params]/route.ts
import { routes, crud, someBackend } from '@asasvirtuais/crud'

const implementation = crud(someBackend())
const { find, list, create, update, remove } = routes({ implementation })

export { find as GET, create as POST, update as PATCH, remove as DELETE }
```

## API

All operations use props-based interface:

```typescript
// Find by ID
await db.find({ table: 'users', id: '123' })

// Create new record  
await db.create({ table: 'users', data: { name: 'João' } })

// Update existing record
await db.update({ table: 'users', id: '123', data: { name: 'João Silva' } })

// Delete record
await db.remove({ table: 'users', id: '123' })

// List with query (FeathersJS compatible)
await db.list({ table: 'users', query: { active: true, $limit: 10 } })
```

## License

MIT