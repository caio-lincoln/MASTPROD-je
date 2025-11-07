import { NextResponse } from "next/server"
import { sendEmailWithEmpresaConfig } from "@/lib/email/mailer"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const empresa_id: string | undefined = body?.empresa_id
    const destinatario: string | undefined = body?.destinatario
    if (!empresa_id || !destinatario) {
      return NextResponse.json({ error: "empresa_id e destinatario são obrigatórios" }, { status: 400 })
    }

    const info = await sendEmailWithEmpresaConfig(empresa_id, {
      to: destinatario,
      subject: "Teste de SMTP - MASTPROD",
      text: "Este é um e-mail de teste confirmando a configuração de SMTP.",
      html: "<p>Este é um <strong>e-mail de teste</strong> confirmando a configuração de SMTP.</p>",
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao enviar e-mail de teste" }, { status: 500 })
  }
}

