import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

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
  description: "India's premier AI education platform. Enterprise-grade AI certification programs for professionals, students, entrepreneurs, and leaders.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico",  sizes: "any" },
    ],
    shortcut: "/favicon.svg",
    apple:    "/favicon.svg",
  },
  openGraph: {
    siteName:    "oStaran — AI Education Platform",
    type:        "website",
    locale:      "en_IN",
    url:         "https://www.ostaran.com",
    title:       "oStaran — AI Education Platform",
    description: "India's premier AI education platform. Enterprise-grade AI certification programs for professionals, students, entrepreneurs, and leaders.",
    images: [{ url: "/ostaran-logo.png", width: 938, height: 313, alt: "oStaran" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "oStaran — AI Education Platform",
    description: "India's premier AI education platform.",
    images:      ["/ostaran-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Explicit SVG favicon for all modern browsers */}
        <link rel="icon"       type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon"       type="image/x-icon"  href="/favicon.ico" />
        <link rel="shortcut icon"                   href="/favicon.svg" />
        <link rel="apple-touch-icon"                href="/favicon.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
