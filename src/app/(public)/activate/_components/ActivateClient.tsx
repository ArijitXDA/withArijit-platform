'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Loader2, GraduationCap, Calendar, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ActivateState = 'valid' | 'invalid' | 'expired' | 'already_enrolled'

interface Props {
  state:              ActivateState
  token:              string
  seat?:              any
  ge?:                any
  batchInfo?:         any
  isSignedIn?:        boolean
  existingUserEmail?: string | null
}

type ClaimStep = 'idle' | 'signing_in' | 'claiming' | 'batch_select' | 'done' | 'error'

const btnCls = "inline-flex justify-center px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-all"
const btnStyle = { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }

export default function ActivateClient({
  state, token, seat, ge, batchInfo, isSignedIn, existingUserEmail,
}: Props) {
  const [step,        setStep]        = useState<ClaimStep>('idle')
  const [errorMsg,    setErrorMsg]    = useState('')
  const [enrolmentId, setEnrolmentId] = useState<string | null>(null)  // eslint-disable-line

  const supabase = createClient()

  if (state === 'invalid') {
    return (
      <StatusCard icon={<XCircle size={40} className="text-red-400" />}
        title="Invalid Invitation"
        body="This invitation link is invalid or has already been used. If you think this is a mistake, contact the person who invited you."
        action={<Link href="/" className={btnCls} style={btnStyle}>Go to oStaran Home</Link>} />
    )
  }

  if (state === 'expired') {
    return (
      <StatusCard icon={<Clock size={40} className="text-amber-400" />}
        title="Invitation Expired"
        body="This invitation link has expired (valid for 30 days). Please ask the person who enrolled you to resend your invitation."
        action={<Link href="/" className={btnCls} style={btnStyle}>Go to oStaran Home</Link>} />
    )
  }

  if (state === 'already_enrolled') {
    return (
      <StatusCard icon={<CheckCircle2 size={40} className="text-green-400" />}
        title="Already Activated!"
        body={`Your seat in ${seat?.course_name ?? 'the course'} has already been activated. Sign in to access your dashboard.`}
        action={<Link href="/signin" className={btnCls} style={btnStyle}>Go to Dashboard &rarr;</Link>} />
    )
  }

  const gifterName = ge?.organization_name ?? ge?.purchaser_name ?? 'Someone'
  const firstName  = seat?.invitee_name?.split(' ')[0] ?? 'there'

  async function handleClaim() {
    setStep('signing_in')
    setErrorMsg('')
    try {
      if (!isSignedIn) {
        const appUrl    = window.location.origin
        const { error } = await supabase.auth.signInWithOtp({
          email: seat.invitee_email,
          options: {
            emailRedirectTo: `${appUrl}/auth/callback?next=/activate?token=${token}`,
            data: { full_name: seat.invitee_name },
          },
        })
        if (error) throw new Error(error.message)
        setStep('idle')
        setErrorMsg('__magic_link_sent__')
        return
      }

      setStep('claiming')
      const res  = await fetch('/api/group-enrol/claim-seat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Claim failed')

      setEnrolmentId(data.enrolment_id)

      if (data.batch_pre_selected) {
        setStep('done')
      } else {
        setStep('batch_select')
        window.location.href = `/select-batch?course_id=${ge.course_id}&enrolment_id=${data.enrolment_id}`
      }
    } catch (e: any) {
      setErrorMsg(e.message)
      setStep('error')
    }
  }

  if (errorMsg === '__magic_link_sent__') {
    return (
      <StatusCard icon={<div className="text-5xl">📧</div>}
        title="Check your email!"
        body={`We sent a sign-in link to ${seat?.invitee_email}. Click the link in your email to activate your seat. The link expires in 10 minutes.`}
        action={<p className="text-xs text-gray-400 text-center">Didn&apos;t receive it? Check your spam folder, or ask your inviter to resend.</p>} />
    )
  }

  if (step === 'done') {
    return (
      <StatusCard icon={<CheckCircle2 size={40} className="text-green-400" />}
        title="You're Enrolled! 🎉"
        body={`Welcome, ${firstName}! Your seat in ${ge?.course_name} has been activated. You can now access your course dashboard.`}
        action={<Link href="/dashboard" className={btnCls} style={btnStyle}>Go to My Dashboard &rarr;</Link>} />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-2" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-black px-4 py-2 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ostaran-logo.png" alt="oStaran" className="h-7 w-auto object-contain" />
              </div>
            </div>

            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">🎁</span>
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 text-center mb-2">
              You&apos;ve been enrolled!
            </h1>
            <p className="text-gray-500 text-sm text-center mb-6">
              <strong>{gifterName}</strong> has enrolled you in a course on oStaran.
            </p>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 mb-6 space-y-2">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={16} className="text-indigo-600 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-500 uppercase tracking-wide font-semibold">Course</p>
                  <p className="text-sm font-bold text-indigo-900">{ge?.course_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <User size={16} className="text-indigo-600 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-500 uppercase tracking-wide font-semibold">Enrolled For</p>
                  <p className="text-sm font-semibold text-indigo-900">{seat?.invitee_name}</p>
                  <p className="text-xs text-indigo-600">{seat?.invitee_email}</p>
                </div>
              </div>
              {batchInfo ? (
                <div className="flex items-center gap-2.5">
                  <Calendar size={16} className="text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs text-indigo-500 uppercase tracking-wide font-semibold">Batch</p>
                    <p className="text-sm font-semibold text-indigo-900">{batchInfo.label}</p>
                    <p className="text-xs text-indigo-600">
                      {batchInfo.day_of_week} &middot; {batchInfo.start_time?.slice(0,5)} IST
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <Calendar size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-indigo-500 uppercase tracking-wide font-semibold">Batch</p>
                    <p className="text-sm text-indigo-700">You&apos;ll choose your preferred batch after signing in</p>
                  </div>
                </div>
              )}
            </div>

            {existingUserEmail && existingUserEmail.toLowerCase() !== seat?.invitee_email?.toLowerCase() && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                ⚠️ You&apos;re signed in as <strong>{existingUserEmail}</strong>, but this invite
                is for <strong>{seat?.invitee_email}</strong>. Please sign out first.
              </div>
            )}

            {errorMsg && errorMsg !== '__magic_link_sent__' && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={step === 'signing_in' || step === 'claiming'}
              className="w-full py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              {(step === 'signing_in' || step === 'claiming') && <Loader2 size={18} className="animate-spin" />}
              {step === 'idle'       && '🚀 Activate My Seat'}
              {step === 'signing_in' && 'Sending sign-in link…'}
              {step === 'claiming'   && 'Activating your seat…'}
              {step === 'error'      && 'Retry'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              By activating, you agree to oStaran&apos;s{' '}
              <Link href="/terms" className="underline hover:text-gray-600">Terms &amp; Conditions</Link>,{' '}
              <Link href="/refund-policy" className="underline hover:text-gray-600">Refund Policy</Link> and{' '}
              <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCard({ icon, title, body, action }: {
  icon: React.ReactNode; title: string; body: string; action?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="flex justify-center mb-5">{icon}</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{body}</p>
        {action}
      </div>
    </div>
  )
}
