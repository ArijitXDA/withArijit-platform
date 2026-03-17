import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { verifyPaymentSchema } from '@/lib/validations/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = verifyPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data

    const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verify payment error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
