import { z } from 'zod'

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  passcode: z.string().min(6, 'Passcode must be at least 6 characters'),
})

export type AdminLoginInput = z.infer<typeof adminLoginSchema>
