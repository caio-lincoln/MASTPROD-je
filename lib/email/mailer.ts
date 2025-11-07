import nodemailer from "nodemailer"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"

type SmtpConfig = {
  servidor: string
  porta: number
  usuario: string
  senha: string
  ssl: boolean
  remetente: string
  from_nome?: string | null
}

export async function getSmtpConfig(empresaId: string): Promise<SmtpConfig | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("configuracoes_email")
    .select("servidor, porta, usuario, senha, ssl, remetente, from_nome")
    .eq("empresa_id", empresaId)
    .maybeSingle()

  if (error) {
    console.error("Erro ao buscar configuração de e-mail:", error.message)
    return null
  }
  if (!data) return null
  return {
    servidor: data.servidor,
    porta: Number(data.porta) || 587,
    usuario: data.usuario,
    senha: data.senha,
    ssl: !!data.ssl,
    remetente: data.remetente,
    from_nome: data.from_nome ?? null,
  }
}

export async function sendEmailWithEmpresaConfig(empresaId: string, opts: {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}) {
  const config = await getSmtpConfig(empresaId)
  if (!config) throw new Error("Configuração SMTP não encontrada para a empresa")

  const transporter = nodemailer.createTransport({
    host: config.servidor,
    port: config.porta,
    secure: config.ssl, // true para 465, false para outras
    auth: {
      user: config.usuario,
      pass: config.senha,
    },
  })

  // Verifica conexão antes de enviar
  await transporter.verify()

  const fromAddress = config.from_nome
    ? `${config.from_nome} <${config.remetente}>`
    : config.remetente

  const info = await transporter.sendMail({
    from: fromAddress,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  })

  return info
}

