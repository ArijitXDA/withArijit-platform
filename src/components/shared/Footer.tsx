import Link from 'next/link'

const FOOTER_LINKS = {
  Learn: [
    { href: '/courses', label: 'Courses' },
    { href: '/ai-certification', label: 'AI Certification' },
    { href: '/masterclass', label: 'Masterclass' },
    { href: '/library', label: 'Resource Library' },
  ],
  Platform: [
    { href: '/ai-spots', label: 'AI Spots' },
    { href: '/find-ai-job', label: 'Find AI Jobs' },
    { href: '/build-ai-projects', label: 'Build AI Projects' },
    { href: '/become-a-partner', label: 'Become a Partner' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact Us' },
    { href: '/free-webinar', label: 'Free Webinar' },
    { href: '/ai-readiness-quiz', label: 'AI Readiness Quiz' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/refund-policy', label: 'Refund Policy' },
    { href: '/shipping-policy', label: 'Shipping Policy' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="font-extrabold text-white text-xl mb-3">
              with<span className="text-indigo-400">Arijit</span>
            </p>
            <p className="text-sm leading-relaxed mb-4">
              India&apos;s premier AI education platform. Enterprise-grade certification
              programs for professionals, students & leaders.
            </p>
            <p className="text-xs text-gray-500">
              An oStaran Edu Initiative
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-white font-semibold text-sm mb-4">{section}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} oStaran Edu Pvt Ltd. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Made with ❤️ for AI learners across India
          </p>
        </div>
      </div>
    </footer>
  )
}
