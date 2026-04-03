import Image from 'next/image'

const CREDENTIALS = [
  { label: 'Corporate Experience', value: '19 Years Global', sub: 'HSBC · Reliance · Yes Bank · Murugappa · Qubit London' },
  { label: 'Current Role', value: 'CAIO & BI Head', sub: 'FundsIndia · ex-CAIO at AI FinTechs' },
  { label: 'Guest Lecturer', value: 'IIT Bombay', sub: 'KJ Somaiya · NL Dalmia Institute' },
  { label: 'Corporate Coach', value: 'Big 4 & MNCs', sub: 'Deloitte · PwC · McKinsey · Capgemini · Cognizant' },
  { label: 'Learners Trained', value: '50,000+', sub: 'India · USA · Canada' },
  { label: 'Platform Rating', value: '4.9 / 5', sub: 'From verified learner reviews' },
]

export function CourseTrainer() {
  return (
    <section className="py-16 px-4" style={{ background: '#06080f' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-2">Your Trainer</h2>
          <p className="text-slate-500 text-sm">The person who will personally teach every live session</p>
        </div>

        <div className="rounded-3xl border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="grid md:grid-cols-[240px_1fr]">

            {/* Left — photo + name */}
            <div className="flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r text-center"
              style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(79,70,229,0.06)' }}>
              <div className="relative mb-4">
                <Image
                  src="/arijit-image.png"
                  alt="Arijit Chowdhury"
                  width={120} height={120}
                  className="w-28 h-28 rounded-full object-cover object-top border-2"
                  style={{ borderColor: 'rgba(139,92,246,0.5)' }}
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-black flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
              <p className="font-extrabold text-white text-lg">Arijit Chowdhury</p>
              <p className="text-indigo-400 text-xs mt-1">CAIO · AI Educator · Entrepreneur</p>
              <p className="text-slate-500 text-xs mt-2">Mumbai, India 🇮🇳</p>
            </div>

            {/* Right — credentials + bio */}
            <div className="p-8">
              <p className="text-slate-300 leading-relaxed mb-7 text-sm">
                Arijit Chowdhury is one of India&apos;s most sought-after AI educators and corporate trainers.
                With 19 years of global experience spanning HSBC, Reliance, Yes Bank, Murugappa Group, and
                Qubit London — and current roles as CAIO and ex-CTO — he brings deep real-world AI expertise
                into every live session. He doesn&apos;t use slides or pre-recorded content.
                Everything is built live, from scratch, in front of you.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CREDENTIALS.map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl p-3 border"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">{label}</p>
                    <p className="text-white font-extrabold text-sm">{value}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
