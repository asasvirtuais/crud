import type { CRUD, FindProps, CreateProps, UpdateProps, RemoveProps, ListProps } from './core'

export interface FetcherConfig {
  baseUrl?: string
  headers?: Record<string, string>
}

export function fetcher<Readable, Writable = Readable>(config: FetcherConfig = {}): CRUD<Readable, Writable> {
  const { baseUrl = '', headers = {} } = config

  return {
    async find({ table, id }) {
      const response = await fetch(`${baseUrl}/${table}/${id}`, {
        headers
      })
      return response.json()
    },

    async create({ table, data }) {
      const response = await fetch(`${baseUrl}/${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data)
      })
      return response.json()
    },

    async update({ table, id, data }){
      const response = await fetch(`${baseUrl}/${table}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data)
      })
      return response.json()
    },

    async remove({ table, id }){
      const response = await fetch(`${baseUrl}/${table}/${id}`, {
        method: 'DELETE',
        headers
      })
      return response.json()
    },

    async list({ table, query }){
      const params = new URLSearchParams(query as any)
      const response = await fetch(`${baseUrl}/${table}?${params}`, {
        headers
      })
      return response.json()
    }
  }
}