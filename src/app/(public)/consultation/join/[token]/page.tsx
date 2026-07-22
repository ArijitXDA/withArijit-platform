import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Link from 'next/link'
import { ClaimClient } from './_components/ClaimClient'

export const dynamic = 'force-dynamic'

const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-lg mx-auto px-4 py-24 text-center">{children}</div>
}

export default async function ConsultationJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: invite } = await admin
    .from('consultation_invites')
    .select('id, invitee_email, invitee_name, status')
    .eq('invite_token', token)
    .maybeSingle()

  if (!invite) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">Invitation not found</h1>
        <p className="text-gray-600 mt-3">This link is invalid. Please check your email or contact ai@ostaran.com.</p>
      </Shell>
    )
  }
  if (invite.status === 'claimed') {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">Seat already active ✓</h1>
        <p className="text-gray-600 mt-3">You&apos;re in. Head to your dashboard for the session details.</p>
        <Link href="/dashboard" className="inline-block mt-6 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">
          Go to dashboard
        </Link>
      </Shell>
    )
  }

  // Signed-in state.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const signedInEmail = user?.email?.toLowerCase() ?? null
  const inviteeEmail = String(invite.invitee_email).toLowerCase()
  const loginHref = `/login?next=${encodeURIComponent(`/consultation/join/${token}`)}`

  return (
    <Shell>
      <p className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 mb-4">
        Consultation invite
      </p>
      <h1 className="text-2xl font-bold text-gray-900">You&apos;re invited to a consultation</h1>
      <p className="text-gray-600 mt-3">
        Accept your seat to get the session times, the Teams join link and the recordings — as{' '}
        <span className="font-semibold">{invite.invitee_email}</span>.
      </p>

      {!signedInEmail ? (
        <Link href={loginHref} className="inline-block mt-6 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold">
          Sign in to accept
        </Link>
      ) : signedInEmail !== inviteeEmail ? (
        <div className="mt-6">
          <p className="text-sm text-amber-700">
            You&apos;re signed in as {signedInEmail}. This invite is for {invite.invitee_email}.
          </p>
          <Link href={loginHref} className="inline-block mt-3 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold">
            Switch account
          </Link>
        </div>
      ) : (
        <ClaimClient token={token} />
      )}
    </Shell>
  )
}
