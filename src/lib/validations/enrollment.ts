import { z } from 'zod'

const memberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
})

export const selfEnrollmentSchema = z.object({
  payment_id: z.string(),
  order_id: z.string(),
  course_id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
  amount: z.number().positive(),
  discount_code: z.string().optional(),
  payment_frequency: z.enum(['full', 'half', 'monthly']).default('full'),
})

export const giftEnrollmentSchema = z.object({
  payer_name: z.string().min(2),
  payer_email: z.string().email(),
  friend_email: z.string().email(),
  course_id: z.string().uuid(),
  payment_id: z.string(),
  amount: z.number().positive(),
})

export const bulkEnrollmentSchema = z.object({
  course_id: z.string().uuid(),
  batch_id: z.string().min(1),
  payment_id: z.string(),
  members: z.array(memberSchema).min(2, 'Bulk enrollment requires at least 2 members').max(100),
})

export type SelfEnrollmentInput = z.infer<typeof selfEnrollmentSchema>
export type GiftEnrollmentInput = z.infer<typeof giftEnrollmentSchema>
export type BulkEnrollmentInput = z.infer<typeof bulkEnrollmentSchema>
