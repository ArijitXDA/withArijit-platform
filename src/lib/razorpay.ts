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

/**
 * HMAC for oStaran's OWN server-to-server hop: the Razorpay webhook calling
 * /api/enrollment/self. By then the webhook has already verified Razorpay's webhook
 * signature, but it reaches the enrolment route over plain HTTP where a header like
 * `x-webhook-source: razorpay` proves nothing — anyone can send it. Signing with a secret
 * only our servers hold makes that hop unforgeable.
 *
 * The `internal|` prefix is domain separation: without it this HMAC would be computed over
 * the same `order|payment` string as Razorpay's own payment signature, and either value
 * would satisfy the other's check.
 *
 * Deliberately reuses RAZORPAY_KEY_SECRET rather than adding an env var. A new variable that
 * nobody sets would fail CLOSED at runtime and strand paid enrolments — the one outcome worse
 * than the hole being fixed.
 */
export function internalEnrolmentSignature(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`internal|${orderId}|${paymentId}`)
    .digest('hex')
}

export function verifyInternalEnrolmentSignature(
  orderId: string, paymentId: string, signature: string,
): boolean {
  const expectedBuf = Buffer.from(internalEnrolmentSignature(orderId, paymentId))
  const sigBuf      = Buffer.from(signature)
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
