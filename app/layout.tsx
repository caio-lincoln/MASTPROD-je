import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CompanyProvider } from "@/contexts/company-context"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { SWRConfig } from "swr"
import { swrConfig } from "@/lib/cache/swr-config"

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
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <body className={`font-sans h-full ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ErrorBoundary>
          <SWRConfig value={swrConfig}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <CompanyProvider>
                <div className="h-full w-full flex flex-col overflow-hidden">{children}</div>
                <Toaster />
              </CompanyProvider>
            </ThemeProvider>
          </SWRConfig>
        </ErrorBoundary>
      </body>
    </html>
  )
}
