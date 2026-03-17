'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'

  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) {
      // "Email not found" still shows generic message for security
      setError('If this email is registered, you will receive an OTP shortly.')
      setStep('otp') // Still advance so UX isn't confusing
    } else {
      setStep('otp')
    }
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
    router.push(nextPath)
    router.refresh()
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="text-center">
        <Link href="/" className="inline-block font-extrabold text-2xl mb-6">
          with<span className="text-indigo-600">Arijit</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {step === 'email' ? 'Sign in to your account' : 'Enter your OTP'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {step === 'email'
            ? 'Welcome back! Enter your email to continue.'
            : `We sent a 6-digit code to ${email}`}
        </p>
      </div>

      {step === 'email' ? (
        <div className="space-y-4">
          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full"
            onClick={signInWithGoogle}
            type="button"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">Or continue with email</span>
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
            <Alert>
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Button className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={sendOtp} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Mail size={16} className="mr-2" />}
            Send OTP
          </Button>

          <p className="text-center text-sm text-gray-500">
            New student?{' '}
            <Link href="/signup" className="text-indigo-600 hover:underline font-medium">
              Create an account
            </Link>
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
            Verify &amp; Sign In
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
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  )
}
