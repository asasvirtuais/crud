"use client"
import { z } from "zod"
import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from "react"
import {
  createContextFromHook,
  useIndex,
  useAction,
  FieldsProvider,
  FormProvider,
  useFields,
  useForm,
} from "@asasvirtuais/react"
import { CRUD, ListProps } from "./core"

// Re-export hooks from @asasvirtuais/react for convenience
export { useFields, useForm } from "@asasvirtuais/react"

export function database<
  Database extends Record<
    string,
    { readable: z.SomeZodObject; writable: z.SomeZodObject }
  >
>(
  database: Database,
  {
    find,
    create,
    update,
    remove,
    list,
  }: CRUD<
    z.infer<Database[keyof Database]["readable"]>,
    z.infer<Database[keyof Database]["writable"]>
  >
) {
  type TableKey = keyof Database & string

  function useTableProvider<Table extends TableKey>({
    table,
    asAbove,
  }: {
    table: Table
    asAbove?: Record<string, z.infer<Database[Table]["readable"]>>
  }) {
    type Readable = z.infer<Database[Table]["readable"]>
    type Writable = z.infer<Database[Table]["writable"]>

    const index = useIndex<Readable>({ ...(asAbove ?? {}) })

    const array = useMemo(
      () => Object.values(index.index) as Readable[],
      [index.index]
    )

    useEffect(function soBelow() {
      index.setIndex((prev) => ({ ...prev, ...asAbove }))
    }, [])

    const methods = { find, create, update, remove, list } as CRUD<
      Readable,
      Writable
    >

    // Create wrapped method that updates the index after successful operations
    const createWithIndex = useCallback(
      async (props: any) => {
        const result = await methods.create({ ...props, table })
        if (result && (result as any).id) {
          index.set(result as Readable)
        }
        return result
      },
      [methods, table, index]
    )

    const updateWithIndex = useCallback(
      async (props: any) => {
        const result = await methods.update({ ...props, table })
        if (result && (result as any).id) {
          index.set(result as Readable)
        }
        return result
      },
      [methods, table, index]
    )

    const removeWithIndex = useCallback(
      async (props: any) => {
        const result = await methods.remove({ ...props, table })
        if (result && (result as any).id) {
          index.remove(result as Readable)
        }
        return result
      },
      [methods, table, index]
    )

    const listWithIndex = useCallback(
      async (props: any) => {
        const result = await methods.list({ ...props, table })
        if (Array.isArray(result)) {
          index.setIndex(
            Object.fromEntries(result.map((item) => [(item as any).id, item]))
          )
        }
        return result
      },
      [methods, table, index]
    )

    return {
      ...index,
      array,
      find: useAction((props: any) => methods.find({ ...props, table })),
      create: useAction(createWithIndex),
      update: useAction(updateWithIndex),
      remove: useAction(removeWithIndex),
      list: useAction(listWithIndex),
    }
  }

  function useDatabaseProvider(tables: {
    [T in TableKey]: ReturnType<typeof useTableProvider<T>>
  }) {
    return tables
  }

  const [DatabaseProvider, useDatabase] =
    createContextFromHook(useDatabaseProvider)

  function useTable<T extends TableKey>(name: T) {
    return useDatabase()[name]
  }

  function useSingleProvider<Table extends TableKey>({
    id,
    table,
  }: {
    id: string
    table: Table
  }) {
    const { index, find } = useTable(table)
    const [single, setSingle] = useState<z.infer<Database[Table]["readable"]>>(
      () => index[id]
    )
    useEffect(() => {
      if (!single) find.trigger({ id }).then(setSingle)
    }, [])
    return {
      single,
      setSingle,
      loading: find.loading,
    }
  }

  const SingleContext = createContext<
    ReturnType<typeof useSingleProvider<any>> | undefined
  >(undefined)

  function SingleProvider<Table extends TableKey>({
    children,
    ...props
  }: {
    id: string
    table: Table
    children: React.ReactNode
  }) {
    const value = useSingleProvider(props)
    if (!value.single) return null
    return (
      <SingleContext.Provider value={value}>{children}</SingleContext.Provider>
    )
  }

  const useSingle = <Table extends TableKey>() =>
    useContext(SingleContext) as ReturnType<typeof useSingleProvider<Table>>

  // Helper component for CreateForm render prop pattern
  function CreateFormRenderProp<T extends TableKey>({ 
    children 
  }: { 
    children: (props: {
      fields: Partial<z.infer<Database[T]["writable"]>>
      setField: (key: keyof z.infer<Database[T]["writable"]>, value: any) => void
      submit: (e?: React.FormEvent) => Promise<boolean>
      loading: boolean
      error?: Error | null
    }) => React.ReactNode
  }) {
    const { fields, setField } = useFields<z.infer<Database[T]["writable"]>>()
    const { submit, loading, error } = useForm<z.infer<Database[T]["writable"]>, z.infer<Database[T]["readable"]>>()
    
    return <>{children({ fields, setField, submit, loading, error })}</>
  }

  function CreateForm<T extends TableKey>({
    table,
    defaults,
    onSuccess,
    children,
  }: {
    table: T
    defaults?: Partial<z.infer<Database[T]["writable"]>>
    onSuccess?: (result: z.infer<Database[T]["readable"]>) => void
    children: React.ReactNode | ((props: {
      fields: Partial<z.infer<Database[T]["writable"]>>
      setField: (key: keyof z.infer<Database[T]["writable"]>, value: any) => void
      submit: (e?: React.FormEvent) => Promise<boolean>
      loading: boolean
      error?: Error | null
    }) => React.ReactNode)
  }) {
    type Readable = z.infer<Database[T]["readable"]>
    type Writable = z.infer<Database[T]["writable"]>

    const { create } = useTable(table)

    const handleSubmit = useCallback(
      async (fields: Writable) => {
        const result = await create.trigger({ data: fields })
        if (onSuccess) onSuccess(result as Readable)
        return result
      },
      [create, onSuccess]
    )

    return (
      <FieldsProvider<Writable> defaults={defaults || ({} as Writable)}>
        <FormProvider<Writable, Readable> onSubmit={handleSubmit}>
          {typeof children === 'function' ? (
            <CreateFormRenderProp<T>>{children}</CreateFormRenderProp>
          ) : (
            children
          )}
        </FormProvider>
      </FieldsProvider>
    )
  }

  // Helper component for UpdateForm render prop pattern
  function UpdateFormRenderProp<T extends TableKey>({ 
    children 
  }: { 
    children: (props: {
      fields: Partial<z.infer<Database[T]["writable"]>>
      setField: (key: keyof z.infer<Database[T]["writable"]>, value: any) => void
      submit: (e?: React.FormEvent) => Promise<boolean>
      loading: boolean
      error?: Error | null
    }) => React.ReactNode
  }) {
    const { fields, setField } = useFields<Partial<z.infer<Database[T]["writable"]>>>()
    const { submit, loading, error } = useForm<Partial<z.infer<Database[T]["writable"]>>, z.infer<Database[T]["readable"]>>()
    
    return <>{children({ fields, setField, submit, loading, error })}</>
  }

  function UpdateForm<T extends TableKey>({
    table,
    id,
    defaults,
    onSuccess,
    children,
  }: {
    table: TableKey
    id: string
    defaults?: Partial<z.infer<Database[TableKey]["writable"]>>
    onSuccess?: (result: z.infer<Database[TableKey]["readable"]>) => void
    children: React.ReactNode | ((props: {
      fields: Partial<z.infer<Database[T]["writable"]>>
      setField: (key: keyof z.infer<Database[T]["writable"]>, value: any) => void
      submit: (e?: React.FormEvent) => Promise<boolean>
      loading: boolean
      error?: Error | null
    }) => React.ReactNode)
  }) {
    type Readable = z.infer<Database[T]["readable"]>
    type Writable = z.infer<Database[T]["writable"]>

    const { update } = useTable(table)

    const handleSubmit = useCallback(
      async (fields: Partial<Writable>) => {
        const result = await update.trigger({ id, data: fields })
        if (onSuccess) onSuccess(result as Readable)
        return result
      },
      [update, id, onSuccess]
    )

    return (
      <FieldsProvider<Partial<Writable>>
        defaults={defaults || ({} as Partial<Writable>)}
      >
        <FormProvider<Partial<Writable>, Readable> onSubmit={handleSubmit}>
          {typeof children === 'function' ? (
            <UpdateFormRenderProp<T>>{children}</UpdateFormRenderProp>
          ) : (
            children
          )}
        </FormProvider>
      </FieldsProvider>
    )
  }

  // Helper component for FilterForm render prop pattern
  function FilterFormRenderProp<T extends TableKey>({ 
    children 
  }: { 
    children: (props: {
      fields: Partial<ListProps<z.infer<Database[T]["readable"]>>>
      setField: (key: keyof ListProps<z.infer<Database[T]["readable"]>>, value: any) => void
      submit: (e?: React.FormEvent) => Promise<boolean>
      loading: boolean
      error?: Error | null
    }) => React.ReactNode
  }) {
    const { fields, setField } = useFields<ListProps<z.infer<Database[T]["readable"]>>>()
    const { submit, loading, error } = useForm<ListProps<z.infer<Database[T]["readable"]>>, z.infer<Database[T]["readable"]>[]>()
    
    return <>{children({ fields, setField, submit, loading, error })}</>
  }

  function FilterForm<T extends TableKey>({
    table,
    defaults,
    onSuccess,
    children,
  }: {
    table: T
    defaults?: Partial<ListProps<z.infer<Database[T]["readable"]>>>
    onSuccess?: (result: z.infer<Database[T]["readable"]>[]) => void
    children: React.ReactNode | ((props: {
      fields: Partial<ListProps<z.infer<Database[T]["readable"]>>>
      setField: (key: keyof ListProps<z.infer<Database[T]["readable"]>>, value: any) => void
      submit: (e?: React.FormEvent) => Promise<boolean>
      loading: boolean
      error?: Error | null
    }) => React.ReactNode)
  }) {
    type Readable = z.infer<Database[T]["readable"]>
    type Writable = z.infer<Database[T]["writable"]>

    const { list } = useTable(table)

    const handleSubmit = useCallback(
      async (fields: Omit<ListProps<Readable>, "table">) => {
        const result = await list.trigger(fields)
        if (onSuccess) onSuccess(result ?? [])
        return result
      },
      [list, onSuccess]
    )

    return (
      <FieldsProvider<ListProps<Readable>>
        defaults={(defaults || {}) as ListProps<Readable>}
      >
        <FormProvider<ListProps<Readable>, Readable[]> onSubmit={handleSubmit}>
          {typeof children === 'function' ? (
            <FilterFormRenderProp<T>>{children}</FilterFormRenderProp>
          ) : (
            children
          )}
        </FormProvider>
      </FieldsProvider>
    )
  }

  const useCreateForm = <T extends TableKey>(table: T) => {
    return {
      ...useFields<z.infer<Database[T]["writable"]>>(),
      ...useForm<
        z.infer<Database[T]["writable"]>,
        z.infer<Database[T]["readable"]>
      >(),
    }
  }
  const useUpdateForm = <T extends TableKey>(table: T) => {
    return {
      ...useFields<Partial<z.infer<Database[T]["writable"]>>>(),
      ...useForm<
        Partial<z.infer<Database[T]["writable"]>>,
        z.infer<Database[T]["readable"]>
      >(),
    }
  }
  const useFiltersForm = <T extends TableKey>(table: T) => {
    return {
      ...useFields<ListProps<z.infer<Database[T]["readable"]>>>(),
      ...useForm<
        ListProps<z.infer<Database[T]["readable"]>>,
        z.infer<Database[T]["readable"]>[]
      >(),
    }
  }

  return {
    DatabaseProvider,
    useDatabase,
    useTable,
    useTableProvider,
    SingleProvider,
    useSingle,
    CreateForm,
    UpdateForm,
    FilterForm,
    useCreateForm,
    useUpdateForm,
    useFiltersForm,
  }
}
