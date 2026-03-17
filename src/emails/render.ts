import { render } from '@react-email/components'
import * as React from 'react'
import { EnrollmentConfirmation } from './templates/EnrollmentConfirmation'
import { WebinarReminder } from './templates/WebinarReminder'
import { ClassReminder } from './templates/ClassReminder'
import { GiftEnrollment } from './templates/GiftEnrollment'
import { BulkEnrollmentInvite } from './templates/BulkEnrollmentInvite'
import { PaymentFailure } from './templates/PaymentFailure'
import { InstallmentDue } from './templates/InstallmentDue'

type TemplateRenderer = (payload: Record<string, any>) => React.ReactElement

const TEMPLATES: Record<string, TemplateRenderer> = {
  enrollment_confirmation: (p) => React.createElement(EnrollmentConfirmation, p as any),
  webinar_reminder: (p) => React.createElement(WebinarReminder, p as any),
  class_reminder: (p) => React.createElement(ClassReminder, p as any),
  gift_enrollment: (p) => React.createElement(GiftEnrollment, p as any),
  gift_enrollment_confirmation: (p) => React.createElement(GiftEnrollment, p as any),
  bulk_enrollment_invite: (p) => React.createElement(BulkEnrollmentInvite, p as any),
  payment_failure: (p) => React.createElement(PaymentFailure, p as any),
  installment_due: (p) => React.createElement(InstallmentDue, p as any),
}

export async function renderTemplate(templateName: string, payload: Record<string, any>): Promise<string> {
  const renderer = TEMPLATES[templateName]
  if (!renderer) {
    throw new Error(`Unknown email template: ${templateName}`)
  }
  return render(renderer(payload))
}

export const TEMPLATE_SUBJECTS: Record<string, string> = {
  enrollment_confirmation: 'Welcome to withArijit! Your enrollment is confirmed 🎉',
  webinar_reminder: 'Your webinar starts soon! Join now',
  class_reminder: "Your class is tomorrow — Don't miss it!",
  gift_enrollment: "You've received an AI course as a gift! 🎁",
  gift_enrollment_confirmation: 'Your gift enrollment was successful',
  bulk_enrollment_invite: "You've been enrolled! Activate your account",
  payment_failure: 'Action required: Payment failed',
  installment_due: 'Upcoming installment due reminder',
}
