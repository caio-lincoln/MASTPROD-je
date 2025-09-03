"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Lock, Eye, EyeOff } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useLoading } from "@/hooks/use-loading"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const { isLoading, withLoading } = useLoading()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Verificar se há um token de recuperação na URL
    const accessToken = searchParams.get("access_token")
    const refreshToken = searchParams.get("refresh_token")

    if (accessToken && refreshToken) {
      const supabase = createClient()
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    }
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      return
    }

    const supabase = createClient()

    await withLoading(async () => {
      setError(null)
      setMessage("")

      try {
        const { error } = await supabase.auth.updateUser({
          password: password,
        })

        if (error) throw error

        setMessage("Senha redefinida com sucesso! Redirecionando...")

        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : "Erro ao redefinir senha")
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

          {/* Card de Redefinição */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold text-center">Redefinir Senha</CardTitle>
              <CardDescription className="text-center">Digite sua nova senha</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua nova senha"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 pr-10"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
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
                  loadingText="Redefinindo..."
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Redefinir Senha
                  </div>
                </LoadingButton>
              </form>
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
