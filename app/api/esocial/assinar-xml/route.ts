import { type NextRequest, NextResponse } from "next/server"
import { signXMLWithSupabaseCertificate } from "@/lib/esocial/xml-signer"

export async function POST(request: NextRequest) {
  try {
    const { empresaId, certPassword, rawXml } = await request.json()

    // Validar parâmetros obrigatórios
    if (!empresaId || !certPassword || !rawXml) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios: empresaId, certPassword, rawXml",
        },
        { status: 400 },
      )
    }

    // Assinar XML
    const result = await signXMLWithSupabaseCertificate({
      empresaId,
      certPassword,
      rawXml,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        signedXml: result.signedXml,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Erro na API de assinatura XML:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
