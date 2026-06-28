import { categoryIcon } from '@/lib/utils'
import type { IssueCategory } from '@/types'

export function CategoryBadge({ category }: { category: IssueCategory }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
      <span>{categoryIcon(category)}</span>
      <span className="capitalize">{category.replace('_', ' ')}</span>
    </span>
  )
}
