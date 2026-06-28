import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeMap[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-zinc-200 font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
        sizeMap[size],
        className,
      )}
    >
      {initials}
    </div>
  )
}
