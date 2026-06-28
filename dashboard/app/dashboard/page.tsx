import { createClient, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OverviewContent } from './overview-content'

export default async function DashboardPage() {
  const profile = await getProfile()
  if (!profile || profile.role === 'citizen') redirect('/login')

  const supabase = await createClient()

  const { data: overview } = await supabase.functions.invoke('analytics/overview', {
    body: { department_id: profile.role === 'department_admin' ? profile.department_id : undefined, period: '30d' },
  })

  const { data: trendsReported } = await supabase.functions.invoke('analytics/trends', {
    body: { metric: 'reported', period: '30d' },
  })

  const { data: trendsResolved } = await supabase.functions.invoke('analytics/trends', {
    body: { metric: 'resolved', period: '30d' },
  })

  const { data: deptData } = await supabase.functions.invoke('analytics/departments')

  return (
    <OverviewContent
      profile={profile}
      overview={overview}
      trendsReported={trendsReported}
      trendsResolved={trendsResolved}
      departments={deptData}
    />
  )
}
