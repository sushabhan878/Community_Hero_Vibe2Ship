import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('[&_tr]:border-b border-zinc-200 dark:border-zinc-800', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-zinc-200 transition-colors hover:bg-zinc-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/50',
        className,
      )}
      {...props}
    />
  )
}

export function TableHead({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-zinc-500 dark:text-zinc-400 [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props}>
      {children}
    </td>
  )
}
