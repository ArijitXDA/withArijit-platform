import type { Metadata } from 'next'
import { LEGAL } from '@/lib/legalInfo'

export const metadata: Metadata = {
  title: 'Privacy Policy | oStaran',
  description: `Privacy Policy for oStaran / withArijit, operated by ${LEGAL.entityName} — how we collect, use, share, and protect your personal data under India's DPDP Act 2023.`,
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-10">Last updated: 30 June 2026 &nbsp;|&nbsp; Effective from: 1 January 2025</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
          <p>{LEGAL.brandsLong} is an AI education platform operated by <strong>{LEGAL.entityName}</strong>, a company incorporated in India (our registered office is at {LEGAL.registeredOffice}). This Privacy Policy applies to all services offered at {LEGAL.domains} (collectively, "the Platform"), and to everyone whose data we process — <strong>students, learners and their parents/guardians, AI Partners and sub-partners, mentors and co-mentors, recruiters, and job-seeking candidates.</strong></p>
          <p className="mt-2">{LEGAL.entityName} is the "Data Fiduciary" for your personal data under India's Digital Personal Data Protection Act, 2023 ("DPDP Act"). For any privacy query or to exercise your rights, contact our Grievance Officer at <a href={`mailto:${LEGAL.grievanceEmail}`} className="text-indigo-600 hover:underline">{LEGAL.grievanceEmail}</a> (see Section 12).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
          <p>Depending on how you use the Platform, we collect the following categories of personal data:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Identity data:</strong> Full name, date of birth / age, and — for learners under 18 — the identity of a parent or guardian</li>
            <li><strong>Contact data:</strong> Email address, mobile number, WhatsApp number, postal address</li>
            <li><strong>Payment data:</strong> Transaction ID, amount, payment method, GST details. We never store card numbers or CVV — payments are handled entirely by Razorpay</li>
            <li><strong>Session recordings &amp; transcripts:</strong> Live classes and webinars are conducted and <strong>recorded and transcribed on Microsoft Teams</strong>. Recordings and transcripts may capture your name, voice, image (if your camera is on), and chat messages, and are stored and re-shared with enrolled learners and used to generate learning materials (see Sections 3 and 5)</li>
            <li><strong>Partner / mentor data:</strong> For AI Partners and mentors — PAN, bank/UPI details, GSTIN, occupation and network/commission data, needed for payouts and tax compliance</li>
            <li><strong>Recruiter / candidate data:</strong> For the recruiter portal — résumés, career history and job-search preferences you choose to submit</li>
            <li><strong>Usage data:</strong> Pages visited, course progress, session attendance, device type, IP address, browser type</li>
            <li><strong>Communications:</strong> Emails, WhatsApp messages and support tickets exchanged with our team</li>
            <li><strong>Referral data:</strong> Partner / referral codes used during registration</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
          <p>We use your personal data for the following purposes, each tied to a specific lawful basis (Section 4):</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Creating and managing your account</li>
            <li>Delivering course content, live sessions, recordings, transcripts and study materials — including re-sharing session recordings with your cohort and generating AI-assisted summaries, notes and learning aids from transcripts</li>
            <li>Processing payments, issuing GST invoices, and calculating partner commissions / mentor revenue shares and payouts (including PAN/TDS compliance)</li>
            <li>Sending you <strong>transactional</strong> messages (session reminders, joining links, receipts) by email and WhatsApp</li>
            <li>Sending you <strong>marketing / promotional</strong> messages (new courses, offers) by email and WhatsApp <strong>only where you have opted in</strong>, and never to a child</li>
            <li>Issuing certificates, providing support, and improving the Platform</li>
            <li>Complying with legal obligations under Indian law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Lawful Basis for Processing</h2>
          <p>Under the DPDP Act, 2023 we process your personal data on the following bases:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Consent:</strong> For marketing communications, session recording where consent is required, and any processing not covered below. You may withdraw consent at any time, as easily as you gave it (Section 7)</li>
            <li><strong>Performance of your contract / certain legitimate uses (s.7):</strong> Delivering the course you enrolled in, and providing a service you voluntarily requested</li>
            <li><strong>Legal obligation:</strong> GST invoicing, TDS on partner/mentor payouts, financial record-keeping</li>
          </ul>
          <p className="mt-2">Before we collect your data we provide a notice describing what we collect and why, so your consent is free, specific, informed and unambiguous.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing and Processors</h2>
          <p>We do not sell your personal data. We share it only with the following processors and recipients, under contract and only as needed:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Razorpay:</strong> Payment processing (PCI-DSS compliant)</li>
            <li><strong>Microsoft (Teams, OneDrive/SharePoint):</strong> Hosting, recording and transcribing live sessions and storing the resulting recordings and transcripts. This may involve processing on servers outside India</li>
            <li><strong>AiSensy / WhatsApp Business API (Meta):</strong> Session reminders and (where you opted in) course communications</li>
            <li><strong>Email providers (Hostinger / Brevo / Resend):</strong> Transactional and (opted-in) marketing emails</li>
            <li><strong>Supabase:</strong> Secure cloud database hosting (data stored in encrypted form)</li>
            <li><strong>Partners / Referrers:</strong> We share only limited data needed to attribute an enrolment (e.g. that a referral converted) — never your sensitive personal details without your consent</li>
            <li><strong>Legal authorities:</strong> When required by law, court order, or government authority</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Children's Data</h2>
          <p>Some of our programmes are designed for <strong>school students and children under the age of 18</strong>. Where a learner is under 18:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>The account must be created, and the course purchased, by a <strong>parent or legal guardian</strong>, who enters into the contract on the child's behalf;</li>
            <li>We process the child's data only after obtaining <strong>verifiable consent of the parent or guardian</strong>, as required by Section 9 of the DPDP Act, 2023;</li>
            <li>We <strong>do not</strong> undertake behavioural tracking, profiling, or targeted advertising directed at children, and we do not send marketing messages to a child. Communications relating to a child's learning are sent to the parent/guardian;</li>
            <li>A parent/guardian may withdraw consent and request deletion of the child's data at any time via our Grievance Officer.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Marketing Communications &amp; Your Choices</h2>
          <p>We send promotional messages on WhatsApp and email <strong>only with your prior opt-in consent</strong>. Every marketing email carries a one-click unsubscribe link, and you can stop WhatsApp marketing by replying <strong>STOP</strong> or by contacting us. Withdrawing marketing consent will not affect essential transactional messages about a course you are enrolled in.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active and for up to 7 years after account closure for financial and legal compliance. Session recordings and transcripts are retained for the lifetime of the course batch and the associated library access. You may request deletion of your data (subject to legal retention requirements) via our Grievance Officer.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Your Rights</h2>
          <p>As a Data Principal under the DPDP Act, you have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Access a summary of the personal data we process about you</li>
            <li>Correct, complete, update or erase your personal data</li>
            <li>Withdraw consent (including for marketing) at any time</li>
            <li>Nominate another individual to exercise your rights in the event of death or incapacity</li>
            <li>Grievance redressal (Section 12), and to escalate to the <strong>Data Protection Board of India</strong> if unsatisfied</li>
          </ul>
          <p className="mt-2">To exercise any right, email our Grievance Officer at <a href={`mailto:${LEGAL.grievanceEmail}`} className="text-indigo-600 hover:underline">{LEGAL.grievanceEmail}</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cookies</h2>
          <p>We use essential cookies for session management and authentication, and anonymised analytics cookies to understand platform usage. Where required, we ask for your consent to non-essential cookies and you may accept or reject them. We do not use non-essential cookies or tracking for accounts identified as belonging to a child.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Security &amp; Breach Notification</h2>
          <p>We implement industry-standard security measures including HTTPS/TLS encryption, access controls, and secure cloud infrastructure. Payment data is handled entirely by Razorpay and is never stored on our servers. In the event of a personal-data breach, we will notify the Data Protection Board and affected users as required under the DPDP Act.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Grievance Officer &amp; Contact</h2>
          <p>In accordance with the DPDP Act, 2023 and the Information Technology Rules, you may contact our Grievance Officer for any privacy concern or to exercise your rights. We will {LEGAL.grievanceResponse}.</p>
          <div className="mt-3 space-y-1 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p><strong>{LEGAL.entityName}</strong> {(LEGAL.cin || LEGAL.gstin) && <span className="text-gray-500 text-sm">({[LEGAL.cin && `CIN ${LEGAL.cin}`, LEGAL.gstin && `GSTIN ${LEGAL.gstin}`].filter(Boolean).join(' · ')})</span>}</p>
            <p>Grievance Officer{LEGAL.grievanceOfficerName ? `: ${LEGAL.grievanceOfficerName}` : ''}</p>
            <p>Email: <a href={`mailto:${LEGAL.grievanceEmail}`} className="text-indigo-600 hover:underline">{LEGAL.grievanceEmail}</a></p>
            {LEGAL.grievancePhone && <p>Phone: {LEGAL.grievancePhone}</p>}
            <p>Address: {LEGAL.registeredOffice}</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of material changes via email or a prominent notice on the Platform. Continued use after changes constitutes acceptance of the updated policy.</p>
        </section>

      </div>
    </div>
  )
}
