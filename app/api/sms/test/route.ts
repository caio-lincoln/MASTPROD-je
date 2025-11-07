import { NextRequest, NextResponse } from "next/server"

/**
 * Testa envio de SMS via Twilio usando variáveis de ambiente.
 * Body esperado:
 * { provedor: 'twilio', to: string, from?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { provedor, to, from } = await request.json()

    if (!provedor || provedor !== "twilio") {
      return NextResponse.json(
        { error: "Provedor inválido ou não suportado" },
        { status: 400 },
      )
    }

    if (!to) {
      return NextResponse.json(
        { error: "Número de destino (to) é obrigatório" },
        { status: 400 },
      )
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const defaultFrom = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: "Credenciais Twilio ausentes. Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN." },
        { status: 500 },
      )
    }

    const fromNumber = from || defaultFrom
    if (!fromNumber) {
      return NextResponse.json(
        { error: "Número remetente ausente. Configure TWILIO_PHONE_NUMBER ou informe 'from' no corpo." },
        { status: 400 },
      )
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const bodyParams = new URLSearchParams({
      To: String(to),
      From: String(fromNumber),
      Body: "Teste de SMS - MASTPROD",
    })

    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    })

    const data = await resp.json().catch(() => null)

    if (!resp.ok) {
      const errMsg = (data && (data.message || data.error)) || `Falha ao enviar SMS (status ${resp.status})`
      return NextResponse.json({ error: errMsg, details: data || undefined }, { status: 500 })
    }

    return NextResponse.json({ success: true, sid: data?.sid })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

