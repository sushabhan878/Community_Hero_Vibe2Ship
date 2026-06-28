import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl dark:bg-red-900/30">
          🔒
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Unauthorized Access</h1>
        <p className="mt-2 text-zinc-500">
          You don&apos;t have access to this dashboard.
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Contact your administrator if you need access.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Go to Login
        </Link>
      </div>
    </div>
  )
}
