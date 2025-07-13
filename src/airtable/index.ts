import type { CRUD, Query, FindProps, CreateProps, UpdateProps, RemoveProps, ListProps } from '../core'
import airtableSDK from '@asasvirtuais/airtable'

// Convert Query to Airtable query format
function convertQuery<T>(query?: Query<T>): Record<string, any> {
  if (!query) return {}
  
  const airtableQuery: Record<string, any> = {}
  
  // Handle filters
  if (query.$limit) airtableQuery.maxRecords = query.$limit
  if (query.$skip) airtableQuery.offset = query.$skip
  if (query.$sort) {
    const sortEntries = Object.entries(query.$sort)
    if (sortEntries.length > 0) {
      airtableQuery.sort = sortEntries.map(([field, direction]) => ({
        field,
        direction: direction === 1 ? 'asc' : 'desc'
      }))
    }
  }
  if (query.$select) {
    airtableQuery.fields = query.$select
  }
  
  // Handle field filters - convert to Airtable formula format
  const fieldFilters: string[] = []
  Object.entries(query).forEach(([key, value]) => {
    if (key.startsWith('$')) return // Skip special operators
    
    if (typeof value === 'object' && value !== null) {
      // Handle operators
      if ('$ne' in value) fieldFilters.push(`{${key}} != '${value.$ne}'`)
      if ('$in' in value && Array.isArray(value.$in)) {
        fieldFilters.push(`OR(${value.$in.map(v => `{${key}} = '${v}'`).join(', ')})`)
      }
      if ('$nin' in value && Array.isArray(value.$nin)) {
        fieldFilters.push(`NOT(OR(${value.$nin.map(v => `{${key}} = '${v}'`).join(', ')}))`)
      }
      if ('$lt' in value) fieldFilters.push(`{${key}} < ${value.$lt}`)
      if ('$lte' in value) fieldFilters.push(`{${key}} <= ${value.$lte}`)
      if ('$gt' in value) fieldFilters.push(`{${key}} > ${value.$gt}`)
      if ('$gte' in value) fieldFilters.push(`{${key}} >= ${value.$gte}`)
    } else {
      // Direct equality
      fieldFilters.push(`{${key}} = '${value}'`)
    }
  })
  
  // Handle $or and $and
  const queryAny = query as any
  if (queryAny.$or) {
    const orFilters = queryAny.$or.map((subQuery: Query<T>) => convertQuery(subQuery).filterByFormula).filter(Boolean)
    if (orFilters.length > 0) {
      fieldFilters.push(`OR(${orFilters.join(', ')})`)
    }
  }
  
  if (queryAny.$and) {
    const andFilters = queryAny.$and.map((subQuery: Query<T>) => convertQuery(subQuery).filterByFormula).filter(Boolean)
    if (andFilters.length > 0) {
      fieldFilters.push(`AND(${andFilters.join(', ')})`)
    }
  }
  
  if (fieldFilters.length > 0) {
    airtableQuery.filterByFormula = fieldFilters.length === 1 ? fieldFilters[0] : `AND(${fieldFilters.join(', ')})`
  }
  
  return airtableQuery
}

export function airtableCRUD(baseId: string): CRUD {
  const base = airtableSDK({ token }).base(baseId)
  
  return {
    async find<T = any>(props: FindProps): Promise<T> {
      const table = base.table<T, any>(props.table)
      return table.records.find(props.id) as unknown as Promise<T>
    },
    
    async create<T = any>(props: CreateProps<T>): Promise<T> {
      const table = base.table<T, any>(props.table)
      return table.records.create(props.data as any) as unknown as Promise<T>
    },
    
    async update<T = any>(props: UpdateProps<T>): Promise<T> {
      const table = base.table<T, any>(props.table)
      return table.records.update(props.id, props.data as any) as unknown as Promise<T>
    },
    
    async remove<T = any>(props: RemoveProps): Promise<T> {
      const table = base.table<T, any>(props.table)
      return table.records.remove(props.id) as unknown as Promise<T>
    },
    
    async list<T = any>(props: ListProps<T>): Promise<T[]> {
      const table = base.table<T, any>(props.table)
      const airtableQuery = convertQuery(props.query)
      return table.records.list(airtableQuery) as unknown as Promise<T[]>
    }
  }
}
