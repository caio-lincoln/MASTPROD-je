import { type NextRequest, NextResponse } from "next/server"
import { signXMLWithSupabaseCertificate, signXMLWithUserCertificate } from "@/lib/esocial/xml-signer"
import { sanitizeString, isUuid } from "@/lib/security/validation"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { empresaId, certPassword, rawXml } = await request.json()

    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 })
    }

    // Validar parâmetros obrigatórios
    if (!certPassword || !rawXml) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros obrigatórios: certPassword, rawXml",
        },
        { status: 400 },
      )
    }

    // Sanitização e validação básica
    const safeCertPassword = sanitizeString(certPassword)
    // NUNCA sanitizar o XML bruto removendo < >, isso corrompe o conteúdo
    // Apenas garantir que é string e limitar tamanho para evitar payloads excessivos
    const safeXml = typeof rawXml === "string" ? rawXml : String(rawXml ?? "")
    if (safeXml.length > 2_000_000) {
      return NextResponse.json(
        { success: false, error: "XML muito grande" },
        { status: 413 }
      )
    }

    // Assinar XML com certificado vinculado à conta do usuário
    const result = await signXMLWithUserCertificate({
      userId: user.id,
      certPassword: safeCertPassword,
      rawXml: safeXml,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        // Alinhar com DigitalSignatureService: campo esperado é xml_assinado
        xml_assinado: result.signedXml,
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
