'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

function SignInForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const nextPath     = searchParams.get('next') ?? '/dashboard'

  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [step,     setStep]     = useState<'auth' | 'otp'>('auth')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  // Pre-fill email from URL param (passed by PaymentModal)
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }, [searchParams])

  // Surface OAuth callback errors (Supabase puts the detail in the URL hash).
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const desc = (hash.get('error_description') || searchParams.get('error_description') || '').toLowerCase()
    const hadError = !!(searchParams.get('error') || hash.get('error'))
    if (desc.includes('multiple accounts')) {
      setError('This GitHub email is linked to more than one oStaran account. Please sign in with Google, LinkedIn or your email code.')
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (hadError) {
      setError("Sign-in didn't complete. Please try again, or use your email code below.")
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [searchParams])

  async function sendOtp() {
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setLoading(true); setError('')
    // signInWithOtp with shouldCreateUser: true handles BOTH new & existing users
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setStep('otp')
    setLoading(false)
  }

  async function verifyOtp() {
    if (!otp.trim()) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email',
    })
    if (error) {
      setError('Invalid or expired code. Please try again.')
      setLoading(false)
      return
    }
    // Successfully authenticated — go to next (select-batch or dashboard)
    router.push(nextPath)
    router.refresh()
  }

  async function signInWithPassword() {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) { setError('Incorrect email or password.'); setLoading(false); return }
    router.push(nextPath); router.refresh()
  }

  async function signInWithOAuth(provider: 'google' | 'linkedin_oidc' | 'github') {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        scopes: provider === 'linkedin_oidc' ? 'openid profile email' : provider === 'github' ? 'read:user user:email' : undefined,
      },
    })
  }

  const isSelectBatch = nextPath.startsWith('/select-batch')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #111827 100%)' }}>

      {/* Logos */}
      <div className="flex items-center gap-3 mb-10">
        <Image src="/ostaran-logo.png" alt="oStaran" width={110} height={37} className="h-9 w-auto" />
        <span className="text-white/20 text-xl">|</span>
        <Image src="/awa-logo.jpg" alt="AIwithArijit" width={100} height={27} className="h-7 w-auto rounded" />
      </div>

      <div className="w-full max-w-md">

        {/* Context banner — shown when coming from post-payment */}
        {isSelectBatch && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 mb-6">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-green-300 text-sm">
              <span className="font-semibold">Payment successful!</span> Sign in to choose your batch and access your dashboard.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 p-8"
          style={{ background: 'rgba(255,255,255,0.03)' }}>

          {step === 'auth' ? (
            <>
              <div className="mb-7">
                <h1 className="text-white font-extrabold text-2xl">
                  {isSelectBatch ? 'One last step!' : 'Welcome back'}
                </h1>
                <p className="text-slate-400 text-sm mt-1.5">
                  {isSelectBatch
                    ? 'Sign in or create your account to choose your batch.'
                    : 'Sign in to your AI learning dashboard.'}
                </p>
              </div>

              {/* Google */}
              <button
                onClick={() => signInWithOAuth('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all mb-3 border"
                style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)', color: 'white' }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => signInWithOAuth('linkedin_oidc')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all mb-3 text-white"
                style={{ background: '#0A66C2' }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Continue with LinkedIn
              </button>

              {/* GitHub */}
              <button
                onClick={() => signInWithOAuth('github')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all mb-4 text-white"
                style={{ background: '#24292e' }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                Continue with GitHub
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-slate-500 text-xs">or continue with email</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Email */}
              <div className="mb-3">
                <label className="text-slate-400 text-xs block mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs mb-3 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                onClick={sendOtp}
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Mail className="w-4 h-4" />}
                Send verification code
              </button>

              {/* Optional password sign-in (OTP/OAuth remain the default). */}
              {!showPw ? (
                <button onClick={() => { setShowPw(true); setError('') }}
                  className="w-full text-center text-slate-500 text-xs mt-3 hover:text-slate-300 transition-colors">
                  Have a password? Sign in with password
                </button>
              ) : (
                <div className="mt-3">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && signInWithPassword()}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-colors mb-2"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                  />
                  <button
                    onClick={signInWithPassword}
                    disabled={loading || !email.trim() || !password}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    Sign in with password
                  </button>
                </div>
              )}

              <p className="text-center text-slate-600 text-xs mt-3 leading-relaxed">
                By continuing (including with Google, LinkedIn or GitHub) you agree to our{' '}
                <a href="/terms" className="text-indigo-400 hover:underline">Terms</a> and{' '}
                <a href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</a>.
              </p>

              <p className="text-center text-slate-600 text-xs mt-3">
                New here? Just enter your email — we'll create your account automatically.
              </p>
            </>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-white font-extrabold text-2xl">Check your email</h1>
                <p className="text-slate-400 text-sm mt-1.5">
                  We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="text-slate-400 text-xs block mb-1.5">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  autoFocus
                  className="w-full px-4 py-4 rounded-xl text-white text-2xl font-mono tracking-widest text-center focus:outline-none focus:border-indigo-500/50 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs mb-3 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                onClick={verifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all mb-4"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />}
                {isSelectBatch ? 'Verify & Choose My Batch →' : 'Verify & Sign In →'}
              </button>

              <button
                onClick={() => { setStep('auth'); setOtp(''); setError('') }}
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 w-full transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different email
              </button>

              <p className="text-center text-slate-600 text-xs mt-4">
                Didn't receive it? Check spam, or{' '}
                <button onClick={sendOtp} className="text-indigo-400 hover:text-indigo-300 underline">
                  resend code
                </button>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-700 text-xs mt-6">
          Star Analytix Pvt Ltd · All rights reserved
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
