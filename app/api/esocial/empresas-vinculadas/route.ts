import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { ESOCIAL_URLS } from "@/lib/esocial/config"
import { createEsocialFetchOptions } from "@/lib/esocial/ssl-config"

function sanitizeCNPJ(cnpj: string) {
  return (cnpj || "").replace(/\D/g, "")
}

function buildConsultaEnvelope(cnpj: string, dataInicio: string, dataFim: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:esoc="http://www.esocial.gov.br/servicos/empregador/consulta/eventos/v1_0_0">
  <soap:Header />
  <soap:Body>
    <esoc:ConsultarEventos>
      <esoc:consulta>
        <esoc:ideEmpregador>
          <esoc:tpInsc>1</esoc:tpInsc>
          <esoc:nrInsc>${cnpj}</esoc:nrInsc>
        </esoc:ideEmpregador>
        <esoc:consultaEventos>
          <esoc:tipoEvento>S-1000</esoc:tipoEvento>
          <esoc:perApur>${dataInicio}</esoc:perApur>
          <esoc:perApurFim>${dataFim}</esoc:perApurFim>
        </esoc:consultaEventos>
      </esoc:consulta>
    </esoc:ConsultarEventos>
  </soap:Body>
</soap:Envelope>`
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()

    // Tentar autenticar via cookies (SSR)
    let {
      data: { user },
    } = await supabase.auth.getUser()

    // Fallback: Authorization: Bearer <token>
    if (!user?.id) {
      const authHeader = _req.headers.get("authorization") || _req.headers.get("Authorization")
      const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined
      if (token) {
        const byToken = await supabase.auth.getUser(token)
        user = byToken.data.user
      }
    }

    if (!user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { data: certConta, error: certErr } = await supabase
      .from("certificados_conta")
      .select("arquivo_base64, arquivo_url, senha_certificado")
      .eq("user_id", user.id)
      .maybeSingle()

    if (certErr) {
      return NextResponse.json({ error: certErr.message }, { status: 500 })
    }
    let pfxBuffer: Buffer | undefined
    let senha: string | undefined
    let pfxSource: "base64" | "arquivo_url" | "meta" | "direct" | undefined
    let pfxBytesLength: number | undefined
    if (certConta?.arquivo_base64) {
      pfxBuffer = Buffer.from(certConta.arquivo_base64, "base64")
      pfxSource = "base64"
    }
    // Senha: aceitar base64 ou texto puro
    if (certConta?.senha_certificado) {
      try {
        senha = Buffer.from(certConta.senha_certificado, "base64").toString("utf-8")
      } catch (_) {
        senha = certConta.senha_certificado
      }
    }

    // Fallback: baixar do Storage se arquivo_base64 não estiver salvo
    let storageTried = false
    let storageError: string | undefined
    let metaChecked = false
    let metaFound = false
    let metaArquivoUrl: string | undefined
    let directPathTried = false
    let directPathError: string | undefined
    if (!pfxBuffer && certConta?.arquivo_url) {
      try {
        storageTried = true
        const { data: downloaded, error: dlErr } = await supabase
          .storage
          .from("certificados-esocial")
          .download(certConta.arquivo_url)
        if (!dlErr && downloaded) {
          const ab = await downloaded.arrayBuffer()
          pfxBuffer = Buffer.from(new Uint8Array(ab))
          pfxSource = "arquivo_url"
        } else if (dlErr) {
          storageError = dlErr.message
        }
      } catch (e) {
        storageError = e instanceof Error ? e.message : String(e)
      }
    }

    // Fallback 2: buscar metadados JSON (quando a tabela certificados_conta não existe)
    if (!pfxBuffer && (!certConta || !certConta.arquivo_url)) {
      try {
        metaChecked = true
        const metaPath = `usuario-${user.id}/certificado-a1.json`
        const { data: metaBlob, error: metaErr } = await supabase.storage
          .from("certificados-esocial")
          .download(metaPath)
        if (!metaErr && metaBlob) {
          const text = await metaBlob.text()
          const meta = JSON.parse(text)
          if (meta?.arquivo_url) {
            metaFound = true
            metaArquivoUrl = meta.arquivo_url
            const { data: downloaded, error: dlErr } = await supabase
              .storage
              .from("certificados-esocial")
              .download(meta.arquivo_url)
            if (!dlErr && downloaded) {
              const ab = await downloaded.arrayBuffer()
              pfxBuffer = Buffer.from(new Uint8Array(ab))
              pfxSource = "meta"
            } else if (dlErr) {
              storageError = dlErr.message
            }
          }
        } else if (metaErr) {
          storageError = metaErr.message
        }
      } catch (e) {
        storageError = e instanceof Error ? e.message : String(e)
      }
    }

    // Fallback 3: tentar baixar diretamente o caminho padrão pfx se existir
    if (!pfxBuffer) {
      try {
        directPathTried = true
        const directPfxPath = `usuario-${user.id}/certificado-a1.pfx`
        const { data: dl, error: dlErr } = await supabase.storage
          .from("certificados-esocial")
          .download(directPfxPath)
        if (!dlErr && dl) {
          const ab = await dl.arrayBuffer()
          pfxBuffer = Buffer.from(new Uint8Array(ab))
          pfxSource = "direct"
        } else if (dlErr) {
          directPathError = dlErr.message
        }
      } catch (e) {
        directPathError = e instanceof Error ? e.message : String(e)
      }
    }

    // Guardar tamanho dos bytes para diagnóstico
    pfxBytesLength = pfxBuffer?.length

    if (!pfxBuffer) {
      return NextResponse.json({
        error: "Certificado da conta não encontrado",
        diagnostics: {
          hasRecord: Boolean(certConta),
          hasArquivoUrl: Boolean(certConta?.arquivo_url),
          hasArquivoBase64: Boolean(certConta?.arquivo_base64),
          storageTried,
          storageError,
          metaChecked,
          metaFound,
          metaArquivoUrl,
          directPathTried,
          directPathError,
          pfxSource,
          pfxBytesLength,
          senhaPresent: Boolean(senha),
        }
      }, { status: 404 })
    }

    const cnpjParam = _req.nextUrl?.searchParams?.get("cnpj") || undefined
    const cnpjFiltro = cnpjParam ? sanitizeCNPJ(cnpjParam) : undefined

    const { data: empresas, error: empErr } = await supabase
      .from("empresas")
      .select("id, nome, cnpj")
      .order("nome", { ascending: true })

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 500 })
    }

    const ambiente: "producao" | "homologacao" = (process.env.NEXT_PUBLIC_ESOCIAL_AMBIENTE || process.env.ESOCIAL_AMBIENTE || "producao") as any
    const urls = ESOCIAL_URLS[ambiente]

    const linked: { id: string; nome: string; cnpj: string }[] = []

    // Janela ampla para consulta S-1000 (se não houver eventos no período, ainda testamos autorização).
    const hoje = new Date()
    const yyyy = hoje.getFullYear()
    const mm = String(hoje.getMonth() + 1).padStart(2, "0")
    const dd = String(hoje.getDate()).padStart(2, "0")
    const dataFim = `${yyyy}-${mm}-${dd}`
    const dataInicio = `${yyyy - 3}-01-01` // últimos 3 anos

    if (cnpjFiltro && cnpjFiltro.length === 14) {
      // Verificação direta de um CNPJ representado informado pela UI
      const empMatch = (empresas || []).find((e) => sanitizeCNPJ(e.cnpj) === cnpjFiltro)
      try {
        const envelope = buildConsultaEnvelope(cnpjFiltro, dataInicio, dataFim)
        const fetchOptions = createEsocialFetchOptions("POST", envelope, {
          SOAPAction:
            "http://www.esocial.gov.br/servicos/empregador/consulta/eventos/v1_0_0/ServicoConsultarEventos/ConsultarEventos",
        }, {
          pfx: pfxBuffer,
          passphrase: senha,
          rejectUnauthorized: ambiente === "producao",
        })

        const resp = await fetch(urls.consultaEventos, fetchOptions)
        const body = await resp.text()
        const hasErro = /<erro[\s>]/i.test(body)

        if (resp.ok && !hasErro) {
          const empresaResp = empMatch
            ? [{ id: empMatch.id, nome: empMatch.nome, cnpj: empMatch.cnpj }]
            : [{ id: `cnpj:${cnpjFiltro}`, nome: `CNPJ ${cnpjFiltro}`, cnpj: cnpjFiltro }]

          return NextResponse.json({ sucesso: true, autorizado: true, empresas: empresaResp })
        }
        // Não autorizado ou erro de consulta
        return NextResponse.json({ sucesso: true, autorizado: false, empresas: [] })
      } catch (err) {
        // Log detalhado para depuração de mTLS
        const errorObj: any = err
        const errorDiagnostics = {
          name: errorObj?.name,
          code: errorObj?.code,
          causeCode: errorObj?.cause?.code,
          causeMessage: errorObj?.cause?.message,
        }
        console.error("Erro ao consultar CNPJ representado:", err, errorDiagnostics)
        return NextResponse.json({
          sucesso: false,
          autorizado: false,
          empresas: [],
          error: err instanceof Error ? err.message : String(err),
          diagnostics: {
            hasRecord: Boolean(certConta),
            hasArquivoUrl: Boolean(certConta?.arquivo_url),
            hasArquivoBase64: Boolean(certConta?.arquivo_base64),
            storageTried,
            storageError,
            metaChecked,
            metaFound,
            metaArquivoUrl,
            directPathTried,
            directPathError,
            pfxSource,
            pfxBytesLength,
            senhaPresent: Boolean(senha),
            ambiente,
            endpoint: urls?.consultaEventos,
            tls: {
              rejectUnauthorized: ambiente === "producao",
              httpVersion: "1.1",
            },
            error: errorDiagnostics,
          },
        }, { status: 500 })
      }
    }

    // Sem CNPJ informado: varrer empresas conhecidas e retornar as vinculadas
    for (const emp of empresas || []) {
      const cnpj = sanitizeCNPJ(emp.cnpj)
      if (!cnpj || cnpj.length !== 14) continue

      try {
        const envelope = buildConsultaEnvelope(cnpj, dataInicio, dataFim)
        const fetchOptions = createEsocialFetchOptions("POST", envelope, {
          SOAPAction:
            "http://www.esocial.gov.br/servicos/empregador/consulta/eventos/v1_0_0/ServicoConsultarEventos/ConsultarEventos",
        }, {
          pfx: pfxBuffer,
          passphrase: senha,
          rejectUnauthorized: ambiente === "producao",
        })

        const resp = await fetch(urls.consultaEventos, fetchOptions)
        const body = await resp.text()

        const hasErro = /<erro[\s>]/i.test(body)
        if (resp.ok && !hasErro) {
          linked.push({ id: emp.id, nome: emp.nome, cnpj: emp.cnpj })
        }
      } catch (_) {
        // Ignorar erros por empresa; prosseguir
      }
    }

    return NextResponse.json({ sucesso: true, empresas: linked })
  } catch (error) {
    console.error("Erro ao listar empresas vinculadas:", error)
    return NextResponse.json(
      { error: "Erro interno", detalhes: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
