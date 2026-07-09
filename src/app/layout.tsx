import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ostaran.com"),
  title: {
    default: "oStaran — AI Education Platform",
    template: "%s | oStaran",
  },
  description: "India's premier AI education platform. Enterprise-grade AI certification programmes for professionals, students, entrepreneurs & leaders.",
  icons: {
    icon: [
      { url: "/favicon.ico",  sizes: "32x32 16x16", type: "image/x-icon" },
      { url: "/favicon.svg",  type: "image/svg+xml" },
      { url: "/icon.svg",     type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple:    "/favicon.svg",
  },
  openGraph: {
    siteName:    "oStaran — AI Education Platform",
    type:        "website",
    locale:      "en_IN",
    url:         "https://www.ostaran.com",
    title:       "oStaran — AI Education Platform",
    description: "India's premier AI education platform.",
    images: [{ url: "/ostaran-logo.png", width: 938, height: 313, alt: "oStaran" }],
  },
};

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'oStaran',
  legalName: 'Star Analytix Pvt Ltd',
  url: 'https://www.ostaran.com',
  logo: 'https://www.ostaran.com/ostaran-logo.png',
  description: "India's enterprise-grade AI education platform. Globally recognised AI certification programmes for working professionals, students, entrepreneurs, leaders, and tech developers.",
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Mira Road East',
    addressLocality: 'Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '401107',
    addressCountry: 'IN',
  },
  contactPoint: [
    { '@type': 'ContactPoint', contactType: 'customer support', email: 'ai@ostaran.com', availableLanguage: 'English' },
  ],
  sameAs: [
    'https://linkedin.com/company/ostaran',
    'https://youtube.com/@AIwithArijit',
    'https://instagram.com/aiwitharijit',
  ],
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'INR',
    lowPrice: '0',
    highPrice: '129994',
    offerCount: '9',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }}
        />
        {/* LLMs.txt equivalent — AI crawlers read meta description for indexing */}
        <meta name="ai-content-type" content="educational-platform" />
        <meta name="ai-topics" content="artificial intelligence, machine learning, AI certification, generative AI, agentic AI, quantum computing, professional upskilling, India AI education" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <CookieConsent />
        </ThemeProvider>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
