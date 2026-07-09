'use client'
import { useState, useEffect } from 'react'
import { Users, Tag, Shield, Loader2, CheckCircle2, AlertTriangle, Building2, ChevronDown } from 'lucide-react'
import { Price, useCurrency } from '@/lib/currency'

declare global { interface Window { Razorpay: any } }

interface Course  { id: string; name: string; slug: string; mrp: string; target_audience: string | null; total_sessions: number }
interface Batch   { id: string; course_id: string; label: string; day_of_week: string; start_time: string; start_date: string; max_seats: number; seats_filled: number; is_open: boolean }

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-all"

export default function GroupEnrolClient({ courses, batches }: { courses: Course[]; batches: Batch[] }) {
  const { format } = useCurrency()
  // ── Form state ─────────────────────────────────────────────────────────────
  const [courseId,        setCourseId]        = useState('')
  const [quantity,        setQuantity]        = useState(5)
  const [batchId,         setBatchId]         = useState('')
  const [purchaserType,   setPurchaserType]   = useState<'individual'|'partner'|'organization'>('individual')
  const [orgName,         setOrgName]         = useState('')
  const [gstin,           setGstin]           = useState('')
  const [partnerCode,     setPartnerCode]     = useState('')
  const [name,            setName]            = useState('')
  const [email,           setEmail]           = useState('')
  const [mobile,          setMobile]          = useState('')
  const [couponCode,      setCouponCode]      = useState('')
  const [couponStatus,    setCouponStatus]    = useState<'idle'|'checking'|'valid'|'invalid'>('idle')
  const [couponData,      setCouponData]      = useState<any>(null)
  const [step,            setStep]            = useState<'form'|'paying'|'success'>('form')
  const [error,           setError]           = useState('')
  const [manageToken,     setManageToken]     = useState('')
  const [authorised,      setAuthorised]      = useState(false)

  const selectedCourse = courses.find(c => c.id === courseId)
  const availBatches   = batches.filter(b => b.course_id === courseId)
  const mrp            = selectedCourse ? Number(selectedCourse.mrp) : 0

  // Pricing calculation
  const discountPerSeat = couponData?.discount_per_seat ?? 0
  const pricePerSeat    = mrp > 0 ? mrp - discountPerSeat : 0
  const totalMrp        = mrp * quantity
  const totalDiscount   = discountPerSeat * quantity
  const subTotal        = pricePerSeat * quantity
  const gst             = Number((subTotal * 0.18).toFixed(2))
  const totalPayable    = Number((subTotal + gst).toFixed(2))

  // Reset coupon when course/qty changes
  useEffect(() => { setCouponData(null); setCouponStatus('idle') }, [courseId, quantity])

  async function checkCoupon() {
    if (!couponCode.trim() || !courseId || !quantity || !mrp) return
    setCouponStatus('checking')
    try {
      const res  = await fetch('/api/group-enrol/validate-coupon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, course_id: courseId, quantity, mrp_per_seat: mrp }),
      })
      const data = await res.json()
      if (data.valid) { setCouponData(data); setCouponStatus('valid') }
      else            { setCouponData(null); setCouponStatus('invalid'); setError(data.error) }
    } catch { setCouponStatus('invalid') }
  }

  async function handlePay() {
    if (!courseId || !name || !email || !mobile || quantity < 2) {
      setError('Please fill all required fields'); return
    }
    if (!authorised) {
      setError('Please confirm you are authorised to purchase and to provide the participants’ details.'); return
    }
    setError(''); setStep('paying')
    try {
      // Create order
      const orderRes = await fetch('/api/group-enrol/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaser_name:  name, purchaser_email: email, purchaser_mobile: mobile,
          purchaser_type:  purchaserType, organization_name: orgName, gstin,
          partner_code:    partnerCode, course_id: courseId, quantity,
          batch_id:        batchId || null, discount_code: couponCode || null,
        }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error)

      // Open Razorpay
      // Access NEXT_PUBLIC_ env var — Next.js replaces this at build time
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? 'rzp_live_1hENDuiPNasINC'
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         razorpayKey,
          order_id:    order.razorpay_order_id,
          amount:      order.amount_paise,
          currency:    'INR',
          name:        'oStaran — Group Enrolment',
          description: `${quantity} seats · ${selectedCourse?.name}`,
          image:       '/ostaran-logo.png',
          prefill:     { name, email, contact: mobile },
          theme:       { color: '#4f46e5' },
          handler: async (response: any) => {
            const verifyRes = await fetch('/api/group-enrol/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                group_enrolment_id:  order.group_enrolment_id,
              }),
            })
            const verified = await verifyRes.json()
            if (!verifyRes.ok) { reject(new Error(verified.error)); return }
            setManageToken(verified.manage_token)
            setStep('success'); resolve()
          },
          modal: { ondismiss: () => { setStep('form'); resolve() } },
        })
        rzp.on('payment.failed', (r: any) => reject(new Error(r.error?.description)))
        rzp.open()
      })
    } catch (e: any) {
      setError(e.message); setStep('form')
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (step === 'success') {
    const manageUrl = `/group-enrol/manage/${manageToken}`
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <CheckCircle2 size={52} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Payment Successful! 🎉</h2>
          <p className="text-gray-500 text-sm mb-6">
            You've purchased <strong>{quantity} seats</strong> for <strong>{selectedCourse?.name}</strong>.
            Now add your students' details to send them their invitation links.
          </p>
          <a href={manageUrl}
            className="block w-full py-4 rounded-xl font-bold text-white text-base mb-3 hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            Add Students Now →
          </a>
          <p className="text-xs text-gray-400">
            A confirmation email with this link has been sent to <strong>{email}</strong>.
            You can always come back to this page later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="py-14 px-4 text-white" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5 border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
            <Users size={13} /> Group & Corporate Enrolment
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Enrol Your Team in AI</h1>
          <p className="text-indigo-200 text-lg max-w-xl mx-auto">
            Pay once. Each person gets their own account, full course access, and a globally recognised AI certificate.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-indigo-300">
            <span>✔ Minimum 2 seats</span>
            <span>✔ Each student gets individual access</span>
            <span>✔ GST invoice issued</span>
            <span>✔ Seats carry forward indefinitely</span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 grid lg:grid-cols-5 gap-10">

        {/* ── Left: Form ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Course + Quantity */}
          <Section title="1. Choose Course & Quantity">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Course *</label>
              <select value={courseId} onChange={e => { setCourseId(e.target.value); setBatchId('') }} className={inp}>
                <option value="">Select a course…</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {format(Number(c.mrp))} / seat
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Number of Seats *</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(2, q - 1))}
                  className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold text-lg hover:bg-gray-50 transition-colors flex items-center justify-center">−</button>
                <input type="number" min={2} max={500} value={quantity}
                  onChange={e => setQuantity(Math.max(2, Math.min(500, parseInt(e.target.value) || 2)))}
                  className="w-24 text-center border border-gray-200 rounded-xl px-3 py-3 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={() => setQuantity(q => Math.min(500, q + 1))}
                  className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold text-lg hover:bg-gray-50 transition-colors flex items-center justify-center">+</button>
                <span className="text-sm text-gray-400">Min 2 · Max 500</span>
              </div>
            </div>
          </Section>

          {/* Batch selection */}
          {courseId && availBatches.length > 0 && (
            <Section title="2. Pre-select a Batch (Optional)">
              <p className="text-xs text-gray-500 -mt-2 mb-2">
                If you select a batch now, all your students will be placed in it automatically.
                If you skip, each student can choose their own batch after signing in.
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: !batchId ? '#6366f1' : '#e5e7eb', background: !batchId ? '#eef2ff' : 'white' }}>
                  <input type="radio" checked={!batchId} onChange={() => setBatchId('')} className="accent-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">Students choose their own batch</span>
                </label>
                {availBatches.map(b => {
                  const available = (b.max_seats ?? 999) - (b.seats_filled ?? 0)
                  const disabled  = available < quantity
                  return (
                    <label key={b.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                      style={{ borderColor: batchId === b.id ? '#6366f1' : '#e5e7eb', background: batchId === b.id ? '#eef2ff' : 'white' }}>
                      <input type="radio" checked={batchId === b.id} disabled={disabled}
                        onChange={() => !disabled && setBatchId(b.id)} className="accent-indigo-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{b.label}</p>
                        <p className="text-xs text-gray-500">{b.day_of_week} · {b.start_time?.slice(0,5)} IST · from {b.start_date}</p>
                        {disabled
                          ? <p className="text-xs text-red-500 mt-0.5">Only {available} seats available (you need {quantity})</p>
                          : <p className="text-xs text-green-600 mt-0.5">{available} seats available</p>}
                      </div>
                    </label>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Purchaser details */}
          <Section title={courseId && availBatches.length > 0 ? '3. Your Details' : '2. Your Details'}>
            {/* Type toggle */}
            <div className="flex gap-2 flex-wrap mb-1">
              {(['individual','organization','partner'] as const).map(t => (
                <button key={t} onClick={() => setPurchaserType(t)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border transition-all capitalize"
                  style={{ background: purchaserType === t ? '#4f46e5' : 'white', color: purchaserType === t ? 'white' : '#6b7280', borderColor: purchaserType === t ? '#4f46e5' : '#e5e7eb' }}>
                  {t === 'individual' ? 'Individual' : t === 'organization' ? 'Organisation / Company' : 'oStaran Partner'}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mobile *</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600 font-medium shrink-0">+91</span>
                  <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="9876543210" className={inp} maxLength={10} />
                </div>
              </div>

              {purchaserType === 'organization' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Organisation Name *</label>
                    <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Corp" className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">GSTIN (Optional)</label>
                    <input type="text" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" className={inp} maxLength={15} />
                  </div>
                </>
              )}

              {purchaserType === 'partner' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Partner Code</label>
                  <input type="text" value={partnerCode} onChange={e => setPartnerCode(e.target.value.toUpperCase())} placeholder="PARTNER123" className={inp} />
                </div>
              )}
            </div>
          </Section>

          {/* Coupon */}
          <Section title="Discount Coupon (Optional)">
            <div className="flex gap-2">
              <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus('idle'); setCouponData(null) }}
                placeholder="Enter coupon code" className={inp + ' flex-1'} />
              <button onClick={checkCoupon} disabled={couponStatus === 'checking' || !couponCode.trim() || !courseId}
                className="px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: '#4f46e5' }}>
                {couponStatus === 'checking' ? <Loader2 size={15} className="animate-spin" /> : 'Apply'}
              </button>
            </div>
            {couponStatus === 'valid' && (
              <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mt-1">
                <CheckCircle2 size={13} /> {couponData.label} — <Price inr={couponData.discount_per_seat} /> off per seat
              </p>
            )}
            {couponStatus === 'invalid' && (
              <p className="text-xs text-red-500 mt-1">{error || 'Invalid coupon code'}</p>
            )}
          </Section>

          {error && couponStatus !== 'invalid' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle size={15} /> {error}
            </div>
          )}
        </div>

        {/* ── Right: Price summary + Pay ────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />
              <div className="p-6 space-y-4">
                <h3 className="font-bold text-gray-900 text-base">Order Summary</h3>

                {!courseId ? (
                  <p className="text-sm text-gray-400 text-center py-4">Select a course to see pricing</p>
                ) : (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Course</span>
                        <span className="font-semibold text-gray-900 text-right max-w-[180px] truncate">{selectedCourse?.name}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>MRP per seat</span>
                        <Price inr={mrp} className={couponData ? 'line-through text-gray-400' : 'font-semibold'} />
                      </div>
                      {couponData && (
                        <div className="flex justify-between text-green-600 font-semibold">
                          <span>Discount / seat</span>
                          <span>− <Price inr={discountPerSeat} /></span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>Price per seat</span>
                        <Price inr={pricePerSeat} className="font-semibold" />
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Seats</span>
                        <span className="font-semibold">× {quantity}</span>
                      </div>
                      <div className="border-t border-gray-100 pt-2 flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <Price inr={subTotal} className="font-semibold" />
                      </div>
                      {couponData && (
                        <div className="flex justify-between text-green-600 text-xs">
                          <span>Total savings</span>
                          <span className="font-bold">− <Price inr={totalDiscount} /></span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>GST (18%)</span>
                        <span>+ <Price inr={gst} /></span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                        <span className="font-bold text-gray-800">Total Payable</span>
                        <Price inr={totalPayable} className="text-2xl font-black text-indigo-700" />
                      </div>
                    </div>

                    <label className="flex items-start gap-2 text-[11px] text-gray-500 leading-snug cursor-pointer mb-1 text-left">
                      <input type="checkbox" checked={authorised} onChange={e => setAuthorised(e.target.checked)}
                        className="mt-0.5 accent-indigo-600 shrink-0" />
                      <span>I am authorised to purchase on behalf of my organisation and to provide the participants&apos; details. For any participant under 18, I am their parent/guardian or have obtained guardian consent.</span>
                    </label>
                    <button onClick={handlePay}
                      disabled={step === 'paying' || !courseId || !name || !email || !mobile || quantity < 2 || !authorised}
                      className="w-full py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                      {step === 'paying'
                        ? <><Loader2 size={18} className="animate-spin" /> Opening payment…</>
                        : `Pay ${format(totalPayable)} →`}
                    </button>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                      <Shield size={11} className="text-green-500" />
                      Razorpay · GST Invoice Issued · Seats never expire
                    </div>
                    <p className="text-[11px] text-center text-gray-400 leading-relaxed">
                      By proceeding you agree to our{' '}
                      <a href="/terms" className="underline">Terms</a>,{' '}
                      <a href="/privacy" className="underline">Privacy Policy</a> and{' '}
                      <a href="/refund-policy" className="underline">Refund Policy</a>.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="mt-5 bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">How it works</p>
              {[
                ['💳', 'Pay once', 'for all seats in one transaction'],
                ['👥', 'Add students', 'fill their names, emails & mobiles'],
                ['📧', 'They get invited', 'each person receives a personal link'],
                ['🎓', 'They activate', 'sign in, choose a batch, get access'],
              ].map(([emoji, bold, rest]) => (
                <div key={bold} className="flex items-start gap-2.5">
                  <span className="text-lg leading-none">{emoji}</span>
                  <p className="text-xs text-gray-600 leading-relaxed"><strong>{bold}</strong> — {rest}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
      {children}
    </div>
  )
}

// tiny label utility — scoped to this file
// Using Tailwind directly for labels
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1.5">{children}</label>
}
