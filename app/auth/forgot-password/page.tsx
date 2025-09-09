"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { LoadingButton } from "@/components/ui/loading-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useLoading } from "@/hooks/use-loading"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { isLoading, withLoading } = useLoading()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()

    await withLoading(async () => {
      setError(null)
      setMessage("")

      try {
        const redirectUrl = process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.com/auth/reset-password'
          : 'http://localhost:3000/auth/reset-password'
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        })

        if (error) throw error

        setMessage("Um link de redefinição de senha foi enviado para o seu e-mail.")
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Erro ao enviar e-mail de recuperação")
      }
    })
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          {/* Logo e Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <Shield className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sistema SST</h1>
              <p className="text-muted-foreground">Segurança e Saúde no Trabalho</p>
            </div>
          </div>

          {/* Card de Recuperação */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold text-center">Esqueceu sua senha?</CardTitle>
              <CardDescription className="text-center">
                Digite seu e-mail para receber um link de redefinição de senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-700">{message}</p>
                  </div>
                )}

                <LoadingButton
                  type="submit"
                  className="w-full h-11 font-medium"
                  isLoading={isLoading}
                  loadingText="Enviando..."
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar link de redefinição
                  </div>
                </LoadingButton>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            <p>© 2025 Sistema SST MASTPROD. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
