import { Linkedin } from 'lucide-react'

export function MasterclassTrainer() {
  return (
    <section className="py-16 px-4 bg-white border-t border-gray-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-8 text-center">Your Trainer</h2>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 p-8 rounded-3xl border border-gray-100 shadow-sm bg-gray-50">
          <div className="shrink-0 text-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black mx-auto mb-3">A</div>
            <p className="font-bold text-gray-900">Arijit Chowdhury</p>
            <p className="text-xs text-gray-500 mt-0.5">Researcher &amp; Trainer</p>
            <p className="text-xs text-gray-500">Agentic AI &amp; Quantum Computing</p>
            <a href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
              <Linkedin size={13} /> View LinkedIn Profile
            </a>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-4">
              {['IIT Bombay', 'NLDIBM', 'Star Analytix', 'HSBC', 'Reliance', 'Yes Bank', 'Murugappa', 'Qubit Microsystems'].map(o => (
                <span key={o} className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{o}</span>
              ))}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              19+ years of global experience across fintech, media, and enterprise AI. CAIO at multiple AI FinTechs,
              Guest Lecturer at IIT Bombay, KJ Somaiya &amp; NL Dalmia. Corporate Coach for Deloitte, PwC, McKinsey,
              Capgemini &amp; Cognizant.
            </p>
            <p className="text-xs font-bold text-amber-600">⭐ Trusted by Scientists, CXOs &amp; Professors ⭐</p>
          </div>
        </div>
      </div>
    </section>
  )
}
