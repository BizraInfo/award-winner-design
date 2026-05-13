import type { Metadata } from "next"
import { Inter, Playfair_Display, Amiri, Cinzel } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'
import { GlobalErrorBoundary } from "@/components/infrastructure/GlobalErrorBoundary"
import { PerformanceObserver } from "@/components/infrastructure/PerformanceObserver"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  display: "swap",
})

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
})

export const metadata: Metadata = {
  title: "BIZRA — The Seed of Sovereign Intelligence",
  description:
    "A human-first AI ecosystem that turns intention into verified, ethical, and meaningful action. Not another chatbot. Not another platform that owns you.",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${playfair.variable} ${amiri.variable} ${cinzel.variable} ${jetbrainsMono.variable} font-sans antialiased bg-celestial-navy text-pure-white overflow-x-hidden`}>
        <GlobalErrorBoundary>
          <PerformanceObserver />
          {children}
        </GlobalErrorBoundary>
      </body>
    </html>
  )
}
