import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
}

export function Table<T>({ columns, data, rowKey, emptyMessage = 'Sin registros' }: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-card border border-dashed border-neutral-300 text-sm text-neutral-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-card border border-neutral-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 font-medium', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {data.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-neutral-100">
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-primary', col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}