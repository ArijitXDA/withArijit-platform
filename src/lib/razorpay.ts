import Razorpay from 'razorpay'
import crypto from 'crypto'

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

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
