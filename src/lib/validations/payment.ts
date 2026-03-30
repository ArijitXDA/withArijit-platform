import { z } from 'zod'

export const paymentOrderSchema = z.object({
  course_id:         z.string().uuid('Invalid course ID'),
  payment_frequency: z.enum(['full', 'half', 'monthly']),
  discount_code:     z.string().optional(),
  name:              z.string().min(2, 'Please enter your full name (at least 2 characters)'),
  email:             z.string().email('Please enter a valid email address'),
  mobile:            z
    .string()
    .min(1, 'Please enter your mobile number')
    .min(10, 'Mobile number must be at least 10 digits')
    .max(15, 'Mobile number is too long'),
})

export const verifyPaymentSchema = z.object({
  razorpay_order_id:    z.string(),
  razorpay_payment_id:  z.string(),
  razorpay_signature:   z.string(),
})

export type PaymentOrderInput  = z.infer<typeof paymentOrderSchema>
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>
