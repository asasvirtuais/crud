import fs from 'fs'
import { writeFile } from 'fs/promises'
import YAML from 'yaml'
import { CRUD } from '../core'
import { generateId } from 'ai'
import { fileMutex } from './queue'

export function yamlCRUD<Readable, Writable = Readable>(
  options: { databasePath?: string } = {}
): CRUD<Readable, Writable> {
    const databasePath = options.databasePath || process.cwd() + '/database'
    const tablePath = (name: string) => `${databasePath}/${name}`
    const recordPath = (table: string, id: string) => `${tablePath(table)}/${id}.yaml`
    const readRecord = (table: string, id: string) => {
        const path = recordPath(table, id)
        if ( ! fs.existsSync(path) )
            throw new Error(`Record not found: ${path}`)
        const file = fs.readFileSync(path, 'utf8')
        return YAML.parse(file) as Readable
    }
    return {
        async find({ table, id }) {
            return readRecord(table, id)
        },
        async list({ table, query }) {
            const path = tablePath(table)
            if (!fs.existsSync(path)) {
                // If the table directory doesn't exist, return an empty array.
                return []
            }
            const files = fs.readdirSync(path)
            let records: Readable[] = []
            for (const file of files) {
                if (file.endsWith('.yaml')) {
                    const id = file.slice(0, -5)
                    try {
                        const record = readRecord(table, id)
                        records.push(record)
                    } catch (error) {
                        console.error(`Error reading record ${id} from table ${table}:`, error)
                    }
                }
            }

            if (query) {
                const { $limit, $skip, $sort, $select, ...filters } = query

                // Apply filters
                if (Object.keys(filters).length > 0) {
                    records = records.filter(record => {
                    return Object.entries(filters).every(([key, value]) => {
                        const recordValue = record[key as keyof typeof record]
                        if (typeof value === 'object' && value !== null) {
                            // Handle operators within a field
                            return Object.entries(value).every(([op, opValue]) => {
                                switch (op) {
                                    case '$ne':
                                        return recordValue != opValue
                                    case '$in':
                                        return Array.isArray(opValue) && opValue.includes(recordValue)
                                    case '$nin':
                                        return Array.isArray(opValue) && !opValue.includes(recordValue)
                                    case '$lt':
                                        // @ts-expect-error
                                        return recordValue < opValue as any
                                    case '$lte':
                                        // @ts-expect-error
                                        return recordValue <= opValue as any
                                    case '$gt':
                                        // @ts-expect-error
                                        return recordValue > opValue as any
                                    case '$gte':
                                        // @ts-expect-error
                                        return recordValue >= opValue as any
                                    case '$search':
                                        return typeof recordValue === 'string' && recordValue.toLowerCase().includes(String(opValue).toLowerCase())
                                    default:
                                        return true // Unknown operators are ignored
                                }
                            })
                        }
                        return recordValue === value
                    })
                })
                }
                
                // Apply sorting
                if ($sort) {
                    const sortKeys = Object.keys($sort) as (keyof Readable)[]
                    if (sortKeys.length > 0) {
                        const key = sortKeys[0]
                        const direction = $sort[key] === 1 ? 1 : -1
                        records.sort((a, b) => {
                            if (a[key] < b[key]) return -1 * direction
                            if (a[key] > b[key]) return 1 * direction
                            return 0
                        })
                    }
                }

                // Apply pagination
                const skip = $skip || 0
                const limit = $limit || records.length
                records = records.slice(skip, skip + limit)

                // Apply projection
                if ($select) {
                    records = records.map(record => {
                        // @ts-expect-error
                        const selectedRecord: Partial<Readable> = { id: (record as any).id }
                        // @ts-expect-error
                        ($select as (keyof Readable)[]).forEach(key => {
                            // @ts-expect-error
                            selectedRecord[key] = record[key]
                        })
                        return selectedRecord as Readable
                    })
                }
            }

            return records
        },
        async create({table, ...props}) {
            props.data
            const path = tablePath(table)
            if ( ! fs.existsSync(path ) )
                fs.mkdirSync(path, { recursive: true })
            const id = generateId()
            const record = { id, ...props.data }
            const filePath = recordPath(table, id)
            await fileMutex.run(() => writeFile(filePath, YAML.stringify(record), 'utf8'))
            return record as Readable
        },
        async update({table, id, ...props}) {
            const record = readRecord(table, id)
            const updatedRecord = { ...record, ...props.data }
            await fileMutex.run(() => writeFile(recordPath(table, id), YAML.stringify(updatedRecord), 'utf8'))
            return updatedRecord as Readable
        },
        async remove({table, id}) {
            const path = recordPath(table, id)
            const data = readRecord(table, id)
            if ( ! fs.existsSync(path) )
                throw new Error(`Record not found: ${path}`)
            fs.unlinkSync(path)
            return {
                id,
                ...data
            }
        },
    }
}

// Export factory function - users can provide their own database path
// Example usage:
// export const crud = yamlCRUD({ databasePath: '/path/to/database' })
