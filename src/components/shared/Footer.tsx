import Link from 'next/link'
import Image from 'next/image'
import { Linkedin, Facebook, Mail, Phone, MapPin } from 'lucide-react'

const FOOTER_LINKS = {
  Programmes: [
    { href: '/courses/ai-mastery-for-working-professionals', label: 'For Working Professionals' },
    { href: '/courses/ai-mastery-for-students',             label: 'For Students & Graduates'  },
    { href: '/courses/ai-mastery-for-entrepreneurs',        label: 'For Entrepreneurs'          },
    { href: '/courses/ai-mastery-for-leaders',              label: 'For Leaders & CXOs'         },
    { href: '/courses/ai-mastery-for-school-students',      label: 'For School Students'        },
    { href: '/courses/agentic-ai-development',              label: 'Agentic AI Development'     },
    { href: '/courses/quantum-computing-and-ai',            label: 'Quantum Computing & AI'     },
  ],
  Platform: [
    { href: '/masterclass',        label: 'AI Masterclass'         },
    { href: '/library',            label: 'Resource Library'       },
    { href: '/find-ai-job',        label: 'Find AI Jobs'           },
    { href: '/build-ai-projects',  label: 'Build AI Projects'      },
    { href: '/ai-readiness-quiz',  label: 'AI Readiness Quiz'      },
  ],
  Enterprise: [
    { href: '/contact?type=corporate',    label: 'Corporate Training' },
    { href: 'https://partner.ostaran.com', label: 'Partner Programme' },
    { href: '/contact?type=investor',  label: 'Investor Relations'    },
    { href: '/contact?type=media',     label: 'Media & Press'         },
    { href: '/about',                  label: 'About oStaran'         },
    { href: '/contact',                label: 'Contact Us'            },
  ],
  Legal: [
    { href: '/privacy',          label: 'Privacy Policy'      },
    { href: '/terms',            label: 'Terms & Conditions'  },
    { href: '/refund-policy',    label: 'Refund Policy'       },
    { href: '/shipping-policy',  label: 'Shipping Policy'     },
  ],
}

const SOCIAL_LINKS = [
  { href: 'https://linkedin.com/company/ostaran',      Icon: Linkedin,  label: 'LinkedIn'  },
  { href: 'https://www.facebook.com/808142865707700',  Icon: Facebook,  label: 'Facebook'  },
]

const TRUST_BADGES = [
  { label: 'MSME Registered',          emoji: '🏛️' },
  { label: 'GST Invoices Issued',       emoji: '🧾' },
  { label: '10,000+ Learners',          emoji: '🎓' },
  { label: 'IIT Bombay Affiliated',     emoji: '🏫' },
]

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Top: Brand + Contact + Social ──────────────────────────── */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 pb-12 border-b border-gray-800 mb-12">

          {/* Brand block */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <div className="rounded-lg overflow-hidden inline-block" style={{ background: '#000', padding: '4px 12px' }}>
                <Image src="/ostaran-logo.png" alt="oStaran" width={120} height={40} className="h-9 w-auto object-contain" />
              </div>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              India&apos;s enterprise-grade AI education platform. Globally recognised certifications,
              live classes, and career-transforming programmes for every stage of your journey.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {SOCIAL_LINKS.map(({ href, Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-800 hover:bg-indigo-600 text-gray-400 hover:text-white transition-all">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Contact block */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm">Contact & Support</h3>
            <div className="space-y-3">
              <a href="mailto:ai@ostaran.com" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors group">
                <Mail size={14} className="text-indigo-400 shrink-0" />
                <span>ai@ostaran.com</span>
              </a>
              <a href="https://wa.me/919930051053" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors group">
                <Phone size={14} className="text-green-400 shrink-0" />
                <span>+91 99300 51053 — Mon–Sat, 10am–6pm IST</span>
              </a>
              <div className="flex items-start gap-2.5 text-sm text-gray-500">
                <MapPin size={14} className="text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 font-medium">Star Analytix Pvt Ltd</p>
                  <p>Mira Road East, Mumbai</p>
                  <p>Maharashtra, India — 401107</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm">Trusted & Recognised</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {TRUST_BADGES.map(({ label, emoji }) => (
                <div key={label} className="flex items-center gap-2 bg-gray-900 rounded-xl px-3 py-2.5 border border-gray-800">
                  <span className="text-base">{emoji}</span>
                  <span className="text-xs text-gray-400 leading-tight">{label}</span>
                </div>
              ))}
            </div>
            <Link href="/contact?type=corporate"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Enterprise Enquiry →
            </Link>
          </div>
        </div>

        {/* ── Link columns ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-white font-semibold text-sm mb-4">{section}</p>
              <ul className="space-y-2">
                {links.map(link => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-gray-200 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────────── */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded overflow-hidden opacity-40" style={{ background: '#000', padding: '1px 6px' }}>
              <Image src="/ostaran-logo.png" alt="oStaran" width={70} height={23} className="h-4 w-auto object-contain" />
            </div>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Star Analytix Pvt Ltd. All rights reserved.
            </p>
          </div>
          <p className="text-xs text-gray-700">
            Empowering India with AI · <a href="mailto:ai@ostaran.com" className="hover:text-gray-500 transition-colors">ai@ostaran.com</a>
          </p>
        </div>

      </div>
    </footer>
  )
}
