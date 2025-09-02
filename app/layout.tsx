import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CompanyProvider } from "@/contexts/company-context"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Sistema SST - Segurança e Saúde no Trabalho",
  description: "Sistema completo de gestão de SST com conformidade às NRs brasileiras",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`font-sans h-full overflow-hidden ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <CompanyProvider>
            <div className="h-full w-full flex flex-col">{children}</div>
            <Toaster />
          </CompanyProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
