'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft, FileText } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────
// Suspense boundary wrapper (useSearchParams requires CSR boundary in Next 15+)
// ─────────────────────────────────────────────────────────────────────────
export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpSkeleton />}>
      <SignUpInner />
    </Suspense>
  )
}

function SignUpSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-11 bg-gray-200 rounded" />
        <div className="h-11 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
function SignUpInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // ── Prefill from URL params ─────────────────────────────────────────
  const prefilledEmail = searchParams.get('email') ?? ''
  const resumeToken    = searchParams.get('resume_token')

  const [email, setEmail] = useState(prefilledEmail)
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If email arrived prefilled, show a subtle hint that it came from their resume flow
  const fromResume = !!resumeToken

  // Compute redirect target. If we have a resume token, include it so /auth/callback
  // (Google OAuth path) can forward it; for email OTP we handle it in verifyOtp.
  const nextPath = fromResume
    ? `/dashboard/profile?onboarding=true&from=resume`
    : `/dashboard/profile?onboarding=true`

  // ── Link resume submission to authenticated user (idempotent, fire-and-forget) ──
  async function linkResumeSubmission() {
    if (!resumeToken) return
    try {
      await fetch('/api/resume/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_token: resumeToken }),
      })
    } catch (e) {
      // Non-blocking — parser will still run eventually via email-match fallback
      console.warn('[signup] resume link failed:', e)
    }
  }

  async function sendOtp() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setStep('otp')
    setLoading(false)
  }

  async function verifyOtp() {
    if (!otp.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    })
    if (error) {
      setError('Invalid or expired OTP. Please try again.')
      setLoading(false)
      return
    }

    // Link resume submission BEFORE redirect (best-effort, non-blocking)
    if (resumeToken) await linkResumeSubmission()

    router.push(nextPath)
    router.refresh()
  }

  async function signUpWithGoogle() {
    // Forward resume_token through /auth/callback → next URL so we can link after OAuth
    const nextWithToken = resumeToken
      ? `${nextPath}&resume_token=${encodeURIComponent(resumeToken)}`
      : nextPath

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextWithToken)}`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block font-extrabold text-2xl mb-6">
            with<span className="text-indigo-600">Arijit</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'email' ? 'Start your AI learning journey today.' : `Check your inbox at ${email}`}
          </p>
        </div>

        {/* Resume-continuation hint */}
        {fromResume && step === 'email' && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
               style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: '#fff', border: '1px solid #c7d2fe' }}>
              <FileText size={16} className="text-indigo-600" />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-indigo-900">Résumé received!</p>
              <p className="text-indigo-700/80 text-xs">Sign up to unlock your personalised course pathway.</p>
            </div>
          </div>
        )}

        {step === 'email' ? (
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={signUpWithGoogle} type="button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-2 text-gray-400">Or with email</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                autoComplete="email"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={sendOtp} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
              Send OTP
            </Button>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/signin" className="text-indigo-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">6-digit OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={verifyOtp} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Verify &amp; Create Account
            </Button>
            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mx-auto"
            >
              <ArrowLeft size={14} /> Change email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
