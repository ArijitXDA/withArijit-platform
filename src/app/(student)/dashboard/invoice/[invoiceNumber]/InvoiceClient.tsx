'use client'

interface Txn {
  invoice_number:      string
  student_name:        string
  student_email:       string
  student_mobile:      string | null
  course_name:         string
  payment_type:        string
  instalment_number:   number
  total_instalments:   number
  mrp_reference:       string | number
  discount_amount:     string | number
  amount_paid:         string | number
  net_taxable:         string | number
  gst_amount:          string | number
  cgst_amount:         string | number
  sgst_amount:         string | number
  igst_amount:         string | number
  gst_mode:            string
  gst_pct:             string | number
  payment_mode:        string | null
  payment_date:        string | null
  payment_reference:   string | null
  razorpay_order_id:   string | null
  created_at:          string
}

interface Company {
  company_name:    string
  company_address: string
  city:            string
  state:           string
  state_code:      string
  pincode:         string
  gstin:           string
  pan:             string
  sac_code:        string
  email:           string
  phone:           string
  website:         string
  invoice_prefix:  string
  gst_mode:        string
  cgst_pct:        number
  sgst_pct:        number
  igst_pct:        number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const n = (v: string | number) => Number(v)
const inr = (v: string | number) =>
  '₹' + n(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d + (d.includes('T') ? '' : 'T00:00:00'))
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function paymentTypeLabel(type: string, instNum: number, totalInst: number): string {
  switch (type) {
    case 'full':               return 'Full Course Payment'
    case 'first_instalment':   return `First Instalment (${instNum} of ${totalInst})`
    case 'second_instalment':  return `Second Instalment (${instNum} of ${totalInst})`
    case 'monthly_emi':        return `Monthly EMI — Instalment ${instNum} of ${totalInst}`
    case 'balance_clearance':  return 'Balance Clearance Payment'
    default:                   return 'Course Payment'
  }
}

function payModeLabel(mode: string | null): string {
  if (!mode) return '—'
  const m: Record<string,string> = {
    upi: 'UPI', card: 'Credit/Debit Card',
    netbanking: 'Net Banking', wallet: 'Wallet',
    emi: 'EMI', bank_transfer: 'Bank Transfer',
  }
  return m[mode.toLowerCase()] ?? mode.replace(/_/g, ' ')
}

// ── Row component for invoice table ──────────────────────────────────────────
function TRow({ label, value, bold, accent, border }: {
  label: string; value: string
  bold?: boolean; accent?: boolean; border?: boolean
}) {
  return (
    <tr style={{
      borderTop: border ? '1px solid #e2e8f0' : undefined,
      background: accent ? '#f0fdf4' : undefined,
    }}>
      <td colSpan={3} style={{
        padding: '6px 12px', fontSize: 13, color: bold ? '#1a202c' : '#4a5568',
        fontWeight: bold ? 700 : 400, textAlign: 'right',
      }}>
        {label}
      </td>
      <td style={{
        padding: '6px 16px 6px 0', fontSize: 13, color: accent ? '#166534' : (bold ? '#1a202c' : '#4a5568'),
        fontWeight: bold ? 700 : 400, textAlign: 'right', width: 120,
      }}>
        {value}
      </td>
    </tr>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InvoiceClient({ txn, company }: { txn: Txn; company: Company | null }) {
  const co = company ?? {
    company_name: 'Star Analytix', company_address: 'Mumbai, Maharashtra, India',
    city: 'Mumbai', state: 'Maharashtra', state_code: '27', pincode: '',
    gstin: 'N/A', pan: '', sac_code: '999293',
    email: 'ai@ostaran.com', phone: '', website: 'www.ostaran.com',
    invoice_prefix: 'INV', gst_mode: 'integrated',
    cgst_pct: 9, sgst_pct: 9, igst_pct: 18,
  }

  const isGstinApplied = co.gstin === 'N/A' || !co.gstin.trim()
  const isSplit        = co.gst_mode === 'split'

  const discount   = n(txn.discount_amount)
  const netTaxable = n(txn.net_taxable)
  const gstAmt     = n(txn.gst_amount)
  const totalPaid  = n(txn.amount_paid)
  const mrp        = n(txn.mrp_reference)

  return (
    <>
      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#1e293b', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ostaran-logo-white.svg" alt="oStaran" style={{ height: 24, width: 'auto' }} />
          <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 6 }}>
            Tax Invoice · {txn.invoice_number}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/dashboard/payments" style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 12,
            color: '#94a3b8', border: '1px solid #334155', textDecoration: 'none',
            fontFamily: 'Inter, sans-serif',
          }}>
            ← Back to Payments
          </a>
          <button onClick={() => window.print()} style={{
            padding: '7px 18px', borderRadius: 7, fontSize: 13, fontWeight: 700,
            background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer',
          }}>
            ↓ Download / Print PDF
          </button>
        </div>
      </div>
      <div className="no-print" style={{ height: 56 }} />

      {/* ── Screen wrapper ───────────────────────────────────────────────── */}
      <div className="invoice-screen-wrapper" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '32px 16px 64px',
        background: '#f1f5f9',
      }}>

        {/* ── Invoice page (740×auto, A4 portrait) ─────────────────────── */}
        <div className="invoice-page" style={{
          width: 740, background: '#fff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: 8, overflow: 'hidden',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}>

          {/* ── Header band ─────────────────────────────────────────────── */}
          <div style={{
            background: '#1e293b', padding: '20px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ostaran-logo-white.svg" alt="oStaran" style={{ height: 28, width: 'auto' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
                Tax Invoice
              </div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginTop: 2, letterSpacing: 0.5 }}>
                {txn.invoice_number}
              </div>
            </div>
          </div>

          {/* ── Seller + Buyer block ─────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0' }}>

            {/* Seller (left) */}
            <div style={{ flex: 1, padding: '20px 28px', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Issued By
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                {co.company_name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                {co.company_address}
                {co.pincode && `, ${co.pincode}`}
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  { label: 'GSTIN',   value: isGstinApplied ? 'N/A (Registration Applied)' : co.gstin },
                  { label: 'PAN',     value: co.pan || '—' },
                  { label: 'SAC',     value: co.sac_code },
                  { label: 'Email',   value: co.email },
                  { label: 'Web',     value: co.website },
                ].filter(r => r.value && r.value !== '—').map(({ label, value }) => (
                  <div key={label} style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 6 }}>
                    <span style={{ color: '#94a3b8', minWidth: 42 }}>{label}:</span>
                    <span style={{ color: label === 'GSTIN' && isGstinApplied ? '#d97706' : '#1e293b', fontWeight: label === 'GSTIN' ? 600 : 400 }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyer (right) */}
            <div style={{ flex: 1, padding: '20px 28px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Bill To
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
                {txn.student_name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                {txn.student_email}
              </div>
              {txn.student_mobile && (
                <div style={{ fontSize: 12, color: '#64748b' }}>+91 {txn.student_mobile.replace(/^\+?91/, '')}</div>
              )}

              {/* Invoice meta on right side */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Invoice Date', value: fmtDate(txn.payment_date ?? txn.created_at) },
                  { label: 'Payment Ref',  value: txn.payment_reference ?? '—' },
                  { label: 'Order ID',     value: txn.razorpay_order_id ?? '—' },
                  { label: 'Pay Mode',     value: payModeLabel(txn.payment_mode) },
                ].filter(r => r.value && r.value !== '—').map(({ label, value }) => (
                  <div key={label} style={{ fontSize: 12, color: '#475569', display: 'flex', gap: 6 }}>
                    <span style={{ color: '#94a3b8', minWidth: 80 }}>{label}:</span>
                    <span style={{
                      color: '#1e293b', fontFamily: label.includes('Ref') || label.includes('Order') ? "'Courier New', monospace" : 'inherit',
                      fontSize: label.includes('Ref') || label.includes('Order') ? 11 : 12,
                      wordBreak: 'break-all',
                    }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Line items table ─────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['#', 'Description', 'HSN/SAC', 'Amount (INR)'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: i === 3 ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, color: '#64748b',
                    letterSpacing: 0.8, textTransform: 'uppercase',
                    paddingRight: i === 3 ? 16 : 12,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Main line item */}
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 12px', color: '#64748b', verticalAlign: 'top', width: 28 }}>1</td>
                <td style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 3 }}>
                    {txn.course_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {paymentTypeLabel(txn.payment_type, txn.instalment_number, txn.total_instalments)}
                  </div>
                  {txn.total_instalments > 1 && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      Course total will be billed across {txn.total_instalments} instalments
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Online Education Services · Taxable @ {Number(txn.gst_pct)}%
                  </div>
                </td>
                <td style={{ padding: '14px 12px', color: '#64748b', verticalAlign: 'top', width: 80 }}>
                  {co.sac_code}
                </td>
                <td style={{ padding: '14px 16px 14px 0', color: '#1e293b', fontWeight: 600, textAlign: 'right', verticalAlign: 'top', width: 120 }}>
                  {inr(netTaxable)}
                </td>
              </tr>

              {/* Spacer */}
              <tr><td colSpan={4} style={{ height: 8 }} /></tr>

              {/* Discount row — only if discount was applied */}
              {discount > 0 && (
                <TRow label="Discount / Partner Offer" value={`−${inr(discount)}`} />
              )}

              {/* Taxable amount */}
              <TRow label="Taxable Amount" value={inr(netTaxable)} border />

              {/* GST rows — split or integrated */}
              {isSplit ? (
                <>
                  <TRow label={`CGST @ ${co.cgst_pct}%`} value={inr(txn.cgst_amount)} />
                  <TRow label={`SGST @ ${co.sgst_pct}%`} value={inr(txn.sgst_amount)} />
                </>
              ) : (
                <TRow label={`IGST (GST) @ ${Number(txn.gst_pct)}%`} value={inr(gstAmt)} />
              )}

              {/* Total */}
              <TRow label="TOTAL (INR)" value={inr(totalPaid)} bold accent border />

              <tr><td colSpan={4} style={{ height: 12 }} /></tr>
            </tbody>
          </table>

          {/* ── Amount in words ──────────────────────────────────────────── */}
          <div style={{
            margin: '0 16px 16px', padding: '10px 14px',
            background: '#f8fafc', borderRadius: 6,
            border: '1px solid #e2e8f0', fontSize: 12,
          }}>
            <span style={{ color: '#64748b' }}>Amount in words: </span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>
              {amountInWords(totalPaid)} Only
            </span>
          </div>

          {/* ── Notes section ────────────────────────────────────────────── */}
          <div style={{
            margin: '0 16px 20px', padding: '12px 14px',
            borderRadius: 6, border: '1px solid #fef9c3',
            background: '#fefce8', fontSize: 11, color: '#854d0e', lineHeight: 1.6,
          }}>
            {isGstinApplied && (
              <div>⚠ GSTIN registration is applied for and pending. Invoice will be updated once GSTIN is assigned.</div>
            )}
            <div style={{ marginTop: isGstinApplied ? 4 : 0 }}>
              {isSplit
                ? `Place of supply: ${co.state} (State Code ${co.state_code}) — Intra-state supply. CGST + SGST applicable.`
                : `GST @ ${Number(txn.gst_pct)}% applicable. Place of supply to be updated once GSTIN is assigned.`}
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div style={{
            background: '#f8fafc', borderTop: '1px solid #e2e8f0',
            padding: '14px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
              <div>This is a computer-generated invoice and does not require a physical signature.</div>
              <div>{co.company_name} · {co.website} · {co.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Powered by</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ostaran-logo.svg" alt="oStaran" style={{ height: 18, width: 'auto', opacity: 0.5 }} />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// ── Amount in words (INR) ─────────────────────────────────────────────────────
function amountInWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function words(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n] + ' '
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' '
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + words(n % 100)
    if (n < 100000) return words(Math.floor(n / 1000)) + 'Thousand ' + words(n % 1000)
    if (n < 10000000) return words(Math.floor(n / 100000)) + 'Lakh ' + words(n % 100000)
    return words(Math.floor(n / 10000000)) + 'Crore ' + words(n % 10000000)
  }

  const rupees = Math.floor(amount)
  const paise  = Math.round((amount - rupees) * 100)
  let result   = 'Rupees ' + (words(rupees).trim() || 'Zero')
  if (paise > 0) result += ' and ' + words(paise).trim() + ' Paise'
  return result
}
