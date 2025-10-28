"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Building2, Eye, EyeOff, Sun, Moon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useLoading } from "@/hooks/use-loading"
import { useTheme } from "next-themes"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isLoading, withLoading } = useLoading()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await withLoading(async () => {
      setError(null)

      try {
        const resp = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        const json = await resp.json()
        if (!resp.ok || json.success === false) {
          const msg = json?.error?.message || json?.error || "E-mail / ou Senha errados"
          setError(msg)
          return
        }
        router.push("/")
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "E-mail / ou Senha errados"
        setError(msg)
      }
    })
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-background p-4">
      {/* Botão de tema no topo direito, igual ao do dashboard */}
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 p-0"
          aria-label="Alternar tema"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          {/* Header com logo */}
          <div className="text-center space-y-4">
            <Logo className="mx-auto" priority />
          </div>

          {/* Card de Login */}
          <Card className="shadow-lg border bg-card backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold text-center text-foreground">Fazer Login</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Digite suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
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

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
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

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <LoadingButton
                  type="submit"
                  className="w-full h-11 font-medium"
                  isLoading={isLoading}
                  loadingText="Entrando..."
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Entrar no Sistema
                  </div>
                </LoadingButton>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link
                  href="/auth/forgot-password"
                  className="font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            <p>© 2025 MASTPROD SST. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
