// Core query types for consistent querying across all backends
export type Operators<T, K extends keyof T> = {
  '$or'?: Array<Query<T>>
  '$and'?: Array<Query<T>>
  '$ne'?: T[K]
  '$in'?: T[K][]
  '$nin'?: T[K][]
  '$lt'?: T[K]
  '$lte'?: T[K]
  '$gt'?: T[K]
  '$gte'?: T[K]
}

export type Filters<T> = {
  '$limit'?: number
  '$skip'?: number
  '$sort'?: {
    [K in keyof T]?: 1 | -1
  }
  '$select'?: Array<keyof T>
}

export type Query<T = any> = {
  [K in keyof T]: T[K] | Operators<T, K>
} & Filters<T>

// Core CRUD operations using props pattern
export interface FindProps {
  table: string
  id: string
}

export interface CreateProps<T = any> {
  table: string
  data: T
}

export interface UpdateProps<T = any> {
  table: string
  id: string
  data: Partial<T>
}

export interface RemoveProps {
  table: string
  id: string
}

export interface ListProps<T = any> {
  table: string
  query?: Query<T>
}

// Generic CRUD interface - implementation agnostic
export interface CRUD<Readable = any, Writable = Readable> {
  find   (props: FindProps            ): Promise<Readable>
  create (props: CreateProps<Writable>): Promise<Readable>
  update (props: UpdateProps<Writable>): Promise<Readable>
  remove (props: RemoveProps          ): Promise<Readable>
  list   (props: ListProps<Readable>  ): Promise<Readable[]>
}
