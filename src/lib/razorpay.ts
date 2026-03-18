import Razorpay from 'razorpay'
import crypto from 'crypto'

// Lazy singleton — avoids build-time crash when env vars are not yet available
let _razorpay: Razorpay | null = null
export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set')
    }
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return _razorpay
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  const expectedBuf = Buffer.from(expected)
  const sigBuf = Buffer.from(signature)
  if (expectedBuf.length !== sigBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, sigBuf)
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  const expectedBuf = Buffer.from(expected)
  const sigBuf = Buffer.from(signature)
  if (expectedBuf.length !== sigBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, sigBuf)
}
