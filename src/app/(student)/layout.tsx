import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopNav } from '@/components/dashboard/DashboardTopNav'
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav'
import PushRegistrar from '@/components/PushRegistrar'
import EnableNotifications from '@/components/EnableNotifications'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cookies } from 'next/headers'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // Fetch user + profile server-side so every page gets the correct avatar
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initials = 'S'
  let photoUrl: string | null = null
  let fullName: string | null = null

  if (user?.email) {
    const service = createServiceClient()

    // Try student_profiles first (richest data)
    const { data: profile } = await service
      .from('student_profiles')
      .select('full_name, profile_photo_url')
      .eq('email', user.email)
      .maybeSingle()

    if (profile?.full_name) {
      fullName  = profile.full_name
      photoUrl  = profile.profile_photo_url ?? null
      initials  = profile.full_name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0].toUpperCase())
        .join('')
    } else {
      // Fall back to student_enrolments for the name
      const { data: enrolment } = await service
        .from('student_enrolments')
        .select('student_name')
        .eq('student_email', user.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (enrolment?.student_name) {
        fullName = enrolment.student_name
        initials = enrolment.student_name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w[0].toUpperCase())
          .join('')
      } else {
        // Last resort: derive from email
        const emailName = user.email.split('@')[0]
        initials = emailName[0]?.toUpperCase() ?? 'S'
      }
    }

    // If Google user, try their avatar from auth metadata
    if (!photoUrl) {
      const avatarFromMeta = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null
      if (avatarFromMeta) photoUrl = avatarFromMeta
    }
  }

  // Dev-admin impersonation marker (set by /api/impersonate/student/start).
  let impersonation: { studentEmail: string; adminEmail: string } | null = null
  try {
    const raw = (await cookies()).get('ostaran_impersonation')?.value
    if (raw) impersonation = JSON.parse(raw)
  } catch {}

  return (
    <div className="flex min-h-screen" style={{ background: '#eef3fb' }}>
      {user?.email && <PushRegistrar />}
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {impersonation && (
          <div className="px-4 py-2 flex items-center justify-center gap-3 text-xs font-semibold text-center"
            style={{ background: '#b91c1c', color: '#fff' }}>
            <span>👁️ Viewing as <b>{impersonation.studentEmail}</b> · admin {impersonation.adminEmail}</span>
            <a href="/api/impersonate/student/exit" className="underline font-bold whitespace-nowrap">End impersonation</a>
          </div>
        )}
        <DashboardTopNav
          initials={initials}
          photoUrl={photoUrl}
          fullName={fullName}
          email={user?.email ?? null}
        />
        {user?.email && <EnableNotifications />}
        {/* pb-20 reserves space for mobile bottom nav */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-24 md:pb-6">{children}</main>
      </div>
      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  )
}
