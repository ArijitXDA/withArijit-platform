// Comparison of oStaran vs Indian, US, Canadian & European non-university platforms

interface Row {
  feature: string
  ostaran: { val: string; good: boolean }
  indian:  { val: string; good: boolean }  // Simplilearn, UpGrad, NIIT
  us:      { val: string; good: boolean }  // Coursera, Udemy, edX
  euro:    { val: string; good: boolean }  // FutureLearn, Domestika, IE
}

const ROWS: Row[] = [
  {
    feature: 'Delivery',
    ostaran: { val: 'Live with trainer',     good: true  },
    indian:  { val: 'Mix of live & recorded', good: false },
    us:      { val: 'Pre-recorded only',      good: false },
    euro:    { val: 'Pre-recorded only',      good: false },
  },
  {
    feature: 'AI Kit — Physical',
    ostaran: { val: '✅ Couriered to you',   good: true  },
    indian:  { val: '❌ Not offered',         good: false },
    us:      { val: '❌ Not offered',         good: false },
    euro:    { val: '❌ Not offered',         good: false },
  },
  {
    feature: 'Interim Certificate',
    ostaran: { val: '✅ After Session 13',   good: true  },
    indian:  { val: '❌ End only',            good: false },
    us:      { val: '❌ End only',            good: false },
    euro:    { val: '❌ End only',            good: false },
  },
  {
    feature: 'Weekend Schedule',
    ostaran: { val: '✅ Sat/Sun only',       good: true  },
    indian:  { val: '⚠️ Weekdays too',       good: false },
    us:      { val: '⚠️ Self-paced',         good: false },
    euro:    { val: '⚠️ Self-paced',         good: false },
  },
  {
    feature: 'Audience-Specific Track',
    ostaran: { val: '✅ 5 distinct tracks',  good: true  },
    indian:  { val: '❌ Generic content',    good: false },
    us:      { val: '❌ Generic content',    good: false },
    euro:    { val: '❌ Generic content',    good: false },
  },
  {
    feature: 'Real Projects (Deployable)',
    ostaran: { val: '✅ 3+ owned by you',   good: true  },
    indian:  { val: '⚠️ Some hands-on',     good: false },
    us:      { val: '⚠️ Guided exercises',  good: false },
    euro:    { val: '⚠️ Portfolio tasks',   good: false },
  },
  {
    feature: 'GST Invoice',
    ostaran: { val: '✅ Always issued',      good: true  },
    indian:  { val: '✅ Yes',               good: true  },
    us:      { val: '❌ USD billing only',  good: false },
    euro:    { val: '❌ EUR/GBP billing',   good: false },
  },
  {
    feature: 'Price (Typical)',
    ostaran: { val: '₹48,000',             good: true  },
    indian:  { val: '₹80k – ₹2L',         good: false },
    us:      { val: '₹20k – ₹60k (USD)',   good: false },
    euro:    { val: '₹15k – ₹50k (EUR)',   good: false },
  },
  {
    feature: 'Group Enrolment',
    ostaran: { val: '✅ From 2 seats',      good: true  },
    indian:  { val: '⚠️ Large batches only', good: false },
    us:      { val: '⚠️ Enterprise only',   good: false },
    euro:    { val: '❌ Not available',     good: false },
  },
]

const COL_HEADERS = [
  { key: 'ostaran', label: 'oStaran',        sub: 'India',            highlight: true  },
  { key: 'indian',  label: 'Indian Peers',   sub: 'Simplilearn etc.', highlight: false },
  { key: 'us',      label: 'US Platforms',   sub: 'Coursera, Udemy',  highlight: false },
  { key: 'euro',    label: 'EU Platforms',   sub: 'FutureLearn etc.', highlight: false },
]

export function CourseComparison({ mrp }: { mrp: number }) {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
            How We Compare
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
            Why oStaran?
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto">
            Compared against leading non-university AI platforms from India, US, Canada &amp; Europe
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full min-w-[600px] text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100 w-44">
                  Feature
                </th>
                {COL_HEADERS.map(({ key, label, sub, highlight }) => (
                  <th key={key} className="px-4 py-3 text-center border-b border-gray-100"
                    style={{ background: highlight ? '#eef2ff' : '#f9fafb' }}>
                    <p className="font-extrabold text-sm" style={{ color: highlight ? '#4f46e5' : '#374151' }}>
                      {label}
                    </p>
                    <p className="text-[10px] font-normal text-gray-400 mt-0.5">{sub}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-600 border-b border-gray-50">
                    {row.feature}
                  </td>
                  {COL_HEADERS.map(({ key, highlight }) => {
                    const cell = row[key as keyof Row] as { val: string; good: boolean }
                    return (
                      <td key={key} className="px-4 py-3 text-center border-b border-gray-50"
                        style={{ background: highlight && cell.good ? 'rgba(79,70,229,0.03)' : undefined }}>
                        <span className={`text-xs font-semibold ${
                          highlight
                            ? (cell.good ? 'text-indigo-700' : 'text-gray-400')
                            : (cell.good ? 'text-green-700' : 'text-gray-400')
                        }`}>
                          {cell.val}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Comparison based on publicly available information as of 2025. Prices indicative and vary by course.
        </p>
      </div>
    </section>
  )
}
