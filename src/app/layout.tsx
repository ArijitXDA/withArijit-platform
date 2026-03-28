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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
