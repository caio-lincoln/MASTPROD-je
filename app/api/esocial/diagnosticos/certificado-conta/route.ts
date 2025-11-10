import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const uid = user.id
    const bucket = "certificados-esocial"
    const pfxPath = `usuario-${uid}/certificado-a1.pfx`
    const jsonPath = `usuario-${uid}/certificado-a1.json`

    // Diagnósticos iniciais
    let tableExists = true
    let tableQueryError: string | undefined
    let hasRecord = false
    let hasArquivoUrl = false
    let hasArquivoBase64 = false
    let hasSenhaCertificado = false
    let recordArquivoUrl: string | undefined

    // Tentar consultar tabela certificados_conta
    try {
      const { data: rows, error } = await supabase
        .from("certificados_conta")
        .select("id, user_id, arquivo_url, arquivo_base64, senha_certificado")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle()
      if (error) {
        // Se a relação não existe, marcar como não existente
        if ((error as any)?.code === "42P01" || /relation .* does not exist/i.test(error.message)) {
          tableExists = false
        }
        tableQueryError = error.message
      } else if (rows) {
        hasRecord = true
        hasArquivoUrl = Boolean(rows.arquivo_url)
        hasArquivoBase64 = Boolean(rows.arquivo_base64)
        hasSenhaCertificado = Boolean(rows.senha_certificado)
        recordArquivoUrl = rows.arquivo_url || undefined
      }
    } catch (e) {
      tableExists = false
      tableQueryError = e instanceof Error ? e.message : String(e)
    }

    // Verificar arquivos no Storage
    let directPathTried = false
    let directPathExists = false
    let directPathError: string | undefined
    let jsonChecked = false
    let jsonExists = false
    let jsonError: string | undefined
    let metaArquivoUrl: string | undefined
    let metaDownloadTried = false
    let metaDownloadError: string | undefined
    let metaDownloadExists = false

    try {
      directPathTried = true
      const { data: dl, error } = await supabase.storage.from(bucket).download(pfxPath)
      if (!error && dl) {
        directPathExists = true
      } else if (error) {
        directPathError = error.message
      }
    } catch (e) {
      directPathError = e instanceof Error ? e.message : String(e)
    }

    try {
      jsonChecked = true
      const { data: jb, error } = await supabase.storage.from(bucket).download(jsonPath)
      if (!error && jb) {
        jsonExists = true
        const text = await jb.text()
        const meta = JSON.parse(text)
        metaArquivoUrl = meta?.arquivo_url
        if (metaArquivoUrl) {
          metaDownloadTried = true
          const { data: md, error: mdErr } = await supabase.storage.from(bucket).download(metaArquivoUrl)
          if (!mdErr && md) {
            metaDownloadExists = true
          } else if (mdErr) {
            metaDownloadError = mdErr.message
          }
        }
      } else if (error) {
        jsonError = error.message
      }
    } catch (e) {
      jsonError = e instanceof Error ? e.message : String(e)
    }

    return NextResponse.json({
      user: { id: uid },
      table: {
        exists: tableExists,
        queryError: tableQueryError,
        hasRecord,
        hasArquivoUrl,
        hasArquivoBase64,
        hasSenhaCertificado,
        recordArquivoUrl,
      },
      storage: {
        bucket,
        directPath: { tried: directPathTried, exists: directPathExists, error: directPathError, path: pfxPath },
        json: { checked: jsonChecked, exists: jsonExists, error: jsonError, path: jsonPath },
        meta: { arquivoUrl: metaArquivoUrl, downloadTried: metaDownloadTried, downloadExists: metaDownloadExists, downloadError: metaDownloadError },
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

