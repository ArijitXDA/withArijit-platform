import { z } from 'zod'

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().min(10, 'Enter a valid mobile number').max(15),
  purpose: z.string().min(1, 'Please select a purpose'),
  additional_details: z.string().max(1000).optional(),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>
