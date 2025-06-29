import { z } from 'zod'
import { FindProps, CreateProps, UpdateProps, RemoveProps, ListProps, CRUD } from './core'

export function database<Database extends Record<string, { readable: z.SomeZodObject, writable: z.SomeZodObject }>>(
  database: Database
) {
  return {
    table<T extends keyof Database>(table: T, { create, update, remove, find, list }: CRUD<z.infer<Database[T]['readable']>, z.infer<Database[T]['writable']>>): CRUD<z.infer<Database[T]['readable']>, z.infer<Database[T]['writable']>> {
      return {
        find: async (props) => find({...props, table: String(table) }),
        list: async (props) => list({...props, table: String(table) }),
        create: async (props) => create({...props, table: String(table) }),
        update: async (props) => update({...props, table: String(table) }),
        remove: async (props) => remove({...props, table: String(table) }),
      }
    }
  }
}
