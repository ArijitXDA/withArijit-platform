import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, BookOpen, Award } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Fetch student profile
  const { data: student } = await (supabase as any).from('users').select('*').eq('email', user.email).single()

  // Fetch next upcoming session
  const { data: nextSession } = await (supabase as any)
    .from('session_master_table')
    .select('*')
    .eq('batch_id', student?.batch_id ?? '')
    .gte('session_date', new Date().toISOString().split('T')[0])
    .order('session_date')
    .limit(1)
    .maybeSingle()

  // Fetch certificate count
  const { count: certCount } = await (supabase as any)
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('user_email', user.email)

  const firstName = student?.full_name?.split(' ')[0] ?? 'Student'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {firstName}! 👋</h1>
        <p className="text-gray-500 mt-1">Here&apos;s your learning overview.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Next session */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Calendar size={14} /> Next Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextSession ? (
              <div className="space-y-2">
                <p className="font-semibold text-sm">{nextSession.session_title}</p>
                <p className="text-xs text-gray-500">{formatDate(nextSession.session_date)}</p>
                {nextSession.session_link && (
                  <a
                    href={nextSession.session_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ size: 'sm' }), 'w-full text-center mt-2')}
                  >
                    Join Now →
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming sessions scheduled.</p>
            )}
          </CardContent>
        </Card>

        {/* Course info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <BookOpen size={14} /> My Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{student?.course_name ?? '—'}</p>
            {student?.batch_day_time && (
              <p className="text-xs text-gray-500 mt-1">{student.batch_day_time}</p>
            )}
          </CardContent>
        </Card>

        {/* Certificates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <Award size={14} /> Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{certCount ?? 0}</p>
            <Link href="/dashboard/certificates" className="text-xs text-indigo-600 hover:underline mt-1 block">
              View all →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/sessions" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            View Sessions
          </Link>
          <Link href="/dashboard/certificates" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            My Certificates
          </Link>
          <Link href="/dashboard/payments" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Payment History
          </Link>
          <Link href="/dashboard/profile" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
