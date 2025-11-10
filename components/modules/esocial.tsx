"use client"

import { useState, useEffect } from "react"
 
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  FileText, 
  Plus, 
  Send, 
  RefreshCw, 
  Loader2, 
  Database,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Copy,
  MoreHorizontal,
  RotateCcw,
  Trash2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/contexts/company-context"
import { supabase } from "@/lib/supabase/client"
import { apiFetch } from "@/lib/security/client-api"
import { getFriendlyErrorMessage } from "@/lib/utils/ui-error"
import { DigitalSignatureService } from "@/lib/esocial/digital-signature"
import { getCertificateInfoFromPath } from "@/lib/esocial/xml-signer"

interface EventoEsocial {
  id: string
  tipo_evento: string
  status: string
  protocolo?: string
  created_at: string
  funcionarios?: {
    nome: string
    cpf: string
  }
}

interface LoteEventos {
  id: string
  numero_lote: string
  status: string
  total_eventos: number
  eventos_processados: number
  eventos_erro: number
  data_envio: string
}

interface LogEsocial {
  id: string
  tipo: string
  mensagem: string
  detalhes?: string
  created_at: string
}

export function ESocial() {
  const { selectedCompany, setSelectedCompany } = useCompany()
  const { toast } = useToast()

  const [eventos, setEventos] = useState<EventoEsocial[]>([])
  const [lotes, setLotes] = useState<LoteEventos[]>([])
  const [logs, setLogs] = useState<LogEsocial[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [exames, setExames] = useState<any[]>([])
  const [incidentes, setIncidentes] = useState<any[]>([])
  // Certificado A1 (PKCS#12) - upload e validação
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certPassword, setCertPassword] = useState("")
  const [certUploading, setCertUploading] = useState(false)
  const [certInfo, setCertInfo] = useState<{
    subject?: string
    issuer?: string
    validFrom?: Date
    validTo?: Date
    tipoAssinatura?: string
  } | null>(null)
  const [hasCertificado, setHasCertificado] = useState<boolean>(false)
  const [certAtual, setCertAtual] = useState<{ nome: string; data_validade: string | null; responsavel?: string } | null>(null)
  const [hasCertificadoConta, setHasCertificadoConta] = useState<boolean>(false)
  const [empresasS1000, setEmpresasS1000] = useState<{ id: string; nome: string; cnpj: string }[]>([])
  const [empresaSelecionadaParaSalvar, setEmpresaSelecionadaParaSalvar] = useState<string>("")
  const [trocarCertificado, setTrocarCertificado] = useState<boolean>(false)
  // Perfil e CNPJ representado (fluxo eSocial)
  const [perfilRepresentante, setPerfilRepresentante] = useState<string>("Procurador de Pessoa Jurídica - CNPJ")
  const [cnpjRepresentado, setCnpjRepresentado] = useState<string>("")
  const [verificandoRepresentado, setVerificandoRepresentado] = useState<boolean>(false)
  
  const [loading, setLoading] = useState(false)
  const [sendingEvent, setSendingEvent] = useState(false)
  const [generatingEvent, setGeneratingEvent] = useState(false)
  const [syncingEmployees, setSyncingEmployees] = useState(false)
  const [employeeSyncStatus, setEmployeeSyncStatus] = useState<string>("")
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  
  const [showGerarDialog, setShowGerarDialog] = useState(false)
  const [tipoEventoGerar, setTipoEventoGerar] = useState("")
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState("")
  const [exameSelecionado, setExameSelecionado] = useState("")
  const [incidenteSelecionado, setIncidenteSelecionado] = useState("")

  useEffect(() => {
    if (selectedCompany) {
      carregarEventos()
      carregarLotes()
      carregarLogs()
      carregarFuncionarios()
      carregarExames()
      carregarIncidentes()
      verificarCertificado()
    }
  }, [selectedCompany])

  useEffect(() => {
    verificarCertificadoConta()
  }, [])

  const verificarCertificado = async () => {
    if (!selectedCompany?.id) return
    try {
      const { data, error } = await supabase
        .from("certificados_esocial")
        .select("empresa_id, nome, tipo, arquivo_url, data_validade, valido, responsavel")
        .eq("empresa_id", selectedCompany.id)
        .eq("valido", true)
        .single()
      if (error) return
      setHasCertificado(!!data)
      setCertAtual(data
        ? { nome: data.nome, data_validade: data.data_validade, responsavel: (data as any).responsavel }
        : null)
    } catch (e) {
      // silencioso
    }
  }

  const verificarCertificadoConta = async () => {
    try {
      const { data: authUser } = await supabase.auth.getUser()
      const uid = authUser.user?.id
      if (!uid) return

      // Buscar metadados na tabela certificados_conta
      const { data: certConta, error } = await supabase
        .from("certificados_conta")
        .select("nome, subject, issuer, valid_from, valid_to, arquivo_url, valido")
        .eq("user_id", uid)
        .single()

      const readFromStorageMeta = async () => {
        // fallback: verificar existência do arquivo no storage e ler metadados JSON via signed URL
        const filePath = `usuario-${uid}/certificado-a1.pfx`
        const { data: signedCertUrl } = await supabase.storage
          .from("certificados-esocial")
          .createSignedUrl(filePath, 60)
        const existeArquivo = !!signedCertUrl?.signedUrl

        const metaPath = `usuario-${uid}/certificado-a1.json`
        const { data: signedMetaUrl } = await supabase.storage
          .from("certificados-esocial")
          .createSignedUrl(metaPath, 60)
        let meta: any = null
        if (signedMetaUrl?.signedUrl) {
          try {
            const resp = await fetch(signedMetaUrl.signedUrl)
            if (resp.ok) {
              meta = await resp.json()
            }
          } catch (_) { /* silencioso */ }
        }

        const existe = existeArquivo || !!meta
        setHasCertificadoConta(existe)
        if (existe) {
          const responsavel = authUser.user?.user_metadata?.nome || authUser.user?.email || "Usuário"
          const nome = meta?.nome || "Certificado da Conta"
          const valid_to = meta?.valid_to || null
          setCertAtual({ nome, data_validade: valid_to, responsavel })
          if (meta) {
            setCertInfo({
              subject: meta.subject || nome,
              issuer: meta.issuer || undefined,
              validFrom: meta.valid_from ? new Date(meta.valid_from) : undefined,
              validTo: meta.valid_to ? new Date(meta.valid_to) : undefined,
              tipoAssinatura: "RSA-SHA256",
            })
          }
          carregarEmpresasS1000()
        }
      }

      if (error) {
        await readFromStorageMeta()
        return
      }

      const existe = !!certConta
      setHasCertificadoConta(existe)
      if (existe) {
        const responsavel = authUser.user?.user_metadata?.nome || authUser.user?.email || "Usuário"
        setCertAtual({ nome: certConta?.nome || "Certificado da Conta", data_validade: certConta?.valid_to || null, responsavel })
        // Preencher bloco de informações detalhadas
        setCertInfo({
          subject: certConta?.subject || certConta?.nome,
          issuer: certConta?.issuer || undefined,
          validFrom: certConta?.valid_from ? new Date(certConta.valid_from) : undefined,
          validTo: certConta?.valid_to ? new Date(certConta.valid_to) : undefined,
          tipoAssinatura: "RSA-SHA256",
        })
        carregarEmpresasS1000()
      } else {
        // Se não há registro na tabela, tentar storage metadados
        await readFromStorageMeta()
      }
    } catch (e) {
      // silencioso
    }
  }

  const handleUploadCertificado = async () => {
    if (hasCertificadoConta && !trocarCertificado) {
      toast({ title: "Já existe certificado na sua conta", description: "Use 'Substituir certificado' para trocar o arquivo.", variant: "destructive" })
      return
    }
    if (!certFile || !certPassword) {
      toast({ title: "Informe arquivo e senha", description: "Envie o arquivo .p12/.pfx e a senha.", variant: "destructive" })
      return
    }

    try {
      setCertUploading(true)
      // Identificar usuário e remover arquivos antigos do storage
      const { data: authUser } = await supabase.auth.getUser()
      const uid = authUser.user?.id
      if (!uid) throw new Error("Usuário não autenticado")
      const pfxPath = `usuario-${uid}/certificado-a1.pfx`
      const metaPath = `usuario-${uid}/certificado-a1.json`
      try {
        await supabase.storage.from("certificados-esocial").remove([pfxPath, metaPath])
      } catch (_) {
        // silencioso
      }
      const ds = new DigitalSignatureService()
      const result = await ds.uploadCertificadoA1(certFile, certPassword)
      if (!result.sucesso) {
        throw new Error(result.erro || "Falha no upload do certificado")
      }

      const info = await getCertificateInfoFromPath(result.arquivo_url!, certPassword)
      if (!info.success) {
        throw new Error(info.error || "Falha ao obter informações do certificado")
      }

      // Extrair CN do subject se disponível
      const subject = info.subject || ""
      const cnMatch = subject.match(/(?:CN|cn)=([^,]+)/)
      const nomeCert = cnMatch ? cnMatch[1].trim() : certFile.name

      // Salvar automaticamente na CONTA (tabela + metadados JSON)
      const salvarResp = await ds.salvarCertificadoNaConta(
        result.arquivo_url!,
        nomeCert,
        info.validTo ? info.validTo.toISOString() : "",
        certPassword,
        info.subject,
        info.issuer,
        info.validFrom ? info.validFrom.toISOString() : undefined,
        info.validTo ? info.validTo.toISOString() : undefined,
      )
      if (!salvarResp.sucesso) {
        throw new Error(salvarResp.erro || "Falha ao salvar certificado na conta")
      }

      setCertInfo({
        subject: info.subject,
        issuer: info.issuer,
        validFrom: info.validFrom,
        validTo: info.validTo,
        tipoAssinatura: "RSA-SHA256",
      })
      setHasCertificado(true)
      setHasCertificadoConta(true)
      setCertAtual({
        nome: nomeCert,
        data_validade: info.validTo ? info.validTo.toISOString() : null,
        responsavel: authUser.user?.user_metadata?.nome || authUser.user?.email || "Usuário",
      })
      setTrocarCertificado(false)

      // Atualizar lista de empresas habilitadas
      await carregarEmpresasS1000()

      toast({ title: "Certificado substituído e salvo", description: "Validação e salvamento concluídos na mesma página." })
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro na configuração",
        description: error instanceof Error ? error.message : "Falha ao configurar certificado",
        variant: "destructive",
      })
    } finally {
      setCertUploading(false)
    }
  }

  const carregarEmpresasS1000 = async () => {
    try {
      // Verificar se há usuário autenticado antes da chamada
      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) {
        console.warn('[S-1000] Usuário não autenticado; abortando carga de empresas.')
        toast({ title: 'Sessão necessária', description: 'Faça login para listar empresas com S-1000.', variant: 'default' })
        return
      }

      // Agora lista todas empresas com eventos S-1000 (não apenas vinculadas pela credencial)
      console.group('[S-1000] Empresas (modules/esocial.tsx)')
      console.log('Disparando GET /api/esocial/empresas-s1000')
      const response = await apiFetch('/api/esocial/empresas-s1000', { method: 'GET' })
      console.log('[S-1000] Status da resposta:', response.status)
      const rawBody = await response.clone().text()
      console.log('[S-1000] Corpo bruto:', rawBody)
      let parsed: any = null
      try {
        parsed = JSON.parse(rawBody)
      } catch {
        // manter parsed como null se não for JSON
      }
      console.log('[S-1000] JSON parseado:', parsed)

      if (response.status === 401) {
        console.warn('[S-1000] Não autorizado ao buscar empresas. Verifique sessão/cookies.')
        toast({ title: 'Não autorizado', description: 'Faça login novamente para acessar empresas com S-1000.', variant: 'destructive' })
        console.groupEnd()
        return
      }

      if (!response.ok) {
        console.groupEnd()
        throw new Error('Falha ao obter empresas S-1000')
      }

      const res = parsed ?? (await response.json())
      const empresas = (res?.empresas || []) as { id: string; nome: string; cnpj: string }[]
      console.log('[S-1000] Empresas formatadas:', empresas.length)
      setEmpresasS1000(empresas)
      if (empresas.length > 0) {
        setEmpresaSelecionadaParaSalvar(empresas[0].id)
      }
      console.groupEnd()
    } catch (error) {
      console.error("Erro ao carregar empresas S1000:", error)
      toast({ title: "Erro", description: "Falha ao carregar empresas S-1000", variant: "destructive" })
    }
  }

  const salvarCertificadoNaEmpresaSelecionada = async () => {
    try {
      const ds = new DigitalSignatureService()
      const dataValidade = certInfo?.validTo
        ? new Date(certInfo.validTo).toISOString().split("T")[0]
        : (certAtual?.data_validade || new Date().toISOString().split("T")[0])
      const nomeCert = certInfo?.subject
        ? (certInfo.subject.match(/(?:CN|cn)=([^,]+)/)?.[1]?.trim() || certFile?.name || certAtual?.nome || "Certificado")
        : (certAtual?.nome || certFile?.name || "Certificado")

      // Recuperar último caminho do arquivo salvo (no upload)
      const { data: userResp } = await supabase.auth.getUser()
      const filePath = `usuario-${userResp.user?.id}/certificado-a1.pfx`

      const result = await ds.salvarCertificadoNaConta(
        filePath,
        nomeCert,
        dataValidade || new Date().toISOString().split("T")[0],
        certPassword || undefined,
        certInfo?.subject,
        certInfo?.issuer,
        certInfo?.validFrom ? new Date(certInfo.validFrom).toISOString() : undefined,
        certInfo?.validTo ? new Date(certInfo.validTo).toISOString() : undefined,
      )

      if (!result.sucesso) {
        throw new Error(result.erro || "Erro ao salvar certificado na conta")
      }

      toast({ title: "Certificado salvo na CONTA", description: "O certificado foi vinculado à sua conta com sucesso." })
      // Atualizar visualização com os dados salvos
      await verificarCertificadoConta()
    } catch (error) {
      console.error(error)
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao salvar na conta", variant: "destructive" })
    }
  }

  const carregarEventos = async () => {
    if (!selectedCompany?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("eventos_esocial")
        .select(`
          *,
          funcionarios (
            nome,
            cpf
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      
      setEventos(data || [])
    } catch (error) {
      console.error("Erro ao carregar eventos:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar eventos eSocial",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarLotes = async () => {
    if (!selectedCompany?.id) return

    try {
      const { data, error } = await supabase
        .from("esocial_lotes")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setLotes(data || [])
    } catch (error) {
      console.error("Erro ao carregar lotes:", error)
    }
  }

  const carregarLogs = async () => {
    if (!selectedCompany?.id) return

    try {
      const { data, error } = await supabase
        .from("esocial_logs")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error("Erro ao carregar logs:", error)
    }
  }

  const carregarFuncionarios = async () => {
    if (!selectedCompany?.id) return

    try {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf")
        .eq("empresa_id", selectedCompany.id)
        .eq("ativo", true)

      if (error) throw error
      setFuncionarios(data || [])
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error)
    }
  }

  const carregarExames = async () => {
    if (!selectedCompany?.id) return

    try {
      const { data, error } = await supabase
        .from("exames_aso")
        .select(`
          id,
          tipo_exame,
          data_exame,
          funcionarios (
            nome
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_exame", { ascending: false })
        .limit(50)

      if (error) throw error
      setExames(data || [])
    } catch (error) {
      console.error("Erro ao carregar exames:", error)
    }
  }

  const carregarIncidentes = async () => {
    if (!selectedCompany?.id) return

    try {
      const { data, error } = await supabase
        .from("incidentes")
        .select(`
          id,
          tipo_incidente,
          data_ocorrencia,
          funcionarios (
            nome
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_ocorrencia", { ascending: false })
        .limit(50)

      if (error) throw error
      setIncidentes(data || [])
    } catch (error) {
      console.error("Erro ao carregar incidentes:", error)
    }
  }

  const gerarEvento = async () => {
    if (!tipoEventoGerar || !selectedCompany) return

    setGeneratingEvent(true)
    try {
      let endpoint = ""
      let payload: any = {
        empresa_id: selectedCompany.id,
      }

      if (tipoEventoGerar === "S-2220" && exameSelecionado) {
        endpoint = "/api/esocial/gerar-s2220"
        payload.exame_id = exameSelecionado
      } else if (tipoEventoGerar === "S-2240" && funcionarioSelecionado) {
        endpoint = "/api/esocial/gerar-s2240"
        payload.funcionario_id = funcionarioSelecionado
      } else if (tipoEventoGerar === "S-2210" && incidenteSelecionado) {
        endpoint = "/api/esocial/gerar-s2210"
        payload.incidente_id = incidenteSelecionado
      } else {
        throw new Error("Tipo de evento ou dados necessários não selecionados")
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao gerar evento")
      }

      toast({
        title: "Sucesso",
        description: `Evento ${tipoEventoGerar} gerado com sucesso!`,
      })

      setShowGerarDialog(false)
      setTipoEventoGerar("")
      setFuncionarioSelecionado("")
      setExameSelecionado("")
      setIncidenteSelecionado("")
      
      await carregarEventos()
    } catch (error) {
      console.error("Erro ao gerar evento:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar evento",
        variant: "destructive",
      })
    } finally {
      setGeneratingEvent(false)
    }
  }

  const enviarEvento = async (eventoId: string) => {
    setSendingEvent(true)
    try {
      const response = await apiFetch("/api/esocial/enviar-evento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          empresa_id: selectedCompany?.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao enviar evento")
      }

      toast({
        title: "Sucesso",
        description: "Evento enviado com sucesso para o eSocial!",
      })

      await carregarEventos()
    } catch (error) {
      console.error("Erro ao enviar evento:", error)
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao enviar evento"),
        variant: "destructive",
      })
    } finally {
      setSendingEvent(false)
    }
  }

  const syncEmployees = async () => {
    if (!selectedCompany?.id) {
      toast({
        title: "Erro",
        description: "Nenhuma empresa selecionada",
        variant: "destructive",
      })
      return
    }

    setSyncingEmployees(true)
    setEmployeeSyncStatus("Iniciando sincronização...")

    try {
      setEmployeeSyncStatus("Consultando funcionários no eSocial...")
      
      const response = await apiFetch("/api/esocial/sync-employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresa_id: selectedCompany.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao sincronizar funcionários")
      }

      setEmployeeSyncStatus(`Sincronização concluída! ${result.count || 0} funcionários processados.`)
      
      toast({
        title: "Sucesso",
        description: `Funcionários sincronizados com sucesso! ${result.count || 0} registros processados.`,
      })

      // Recarregar a lista de funcionários
      await carregarFuncionarios()
      
    } catch (error) {
      console.error("Erro ao sincronizar funcionários:", error)
      setEmployeeSyncStatus("Erro na sincronização")
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao sincronizar funcionários"),
        variant: "destructive",
      })
    } finally {
      setSyncingEmployees(false)
      // Limpar status após 5 segundos
      setTimeout(() => {
        setEmployeeSyncStatus("")
      }, 5000)
    }
  }

  const consultarStatus = async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      const response = await apiFetch("/api/esocial/consultar-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          empresa_id: selectedCompany.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao consultar status")
      }

      toast({
        title: "Sucesso",
        description: "Status dos eventos atualizado!",
      })

      await carregarEventos()
    } catch (error) {
      console.error("Erro ao consultar status:", error)
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao consultar status"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "preparando":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Preparando</Badge>
      case "enviado":
        return <Badge variant="default"><Send className="h-3 w-3 mr-1" />Enviado</Badge>
      case "processado":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Processado</Badge>
      case "erro":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>
      case "rejeitado":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Rejeitado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getLogIcon = (tipo: string) => {
    switch (tipo) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getLogBadgeVariant = (tipo: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (tipo) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'warning':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const visualizarEvento = async (eventoId: string) => {
    try {
      const response = await fetch(`/api/esocial/visualizar-evento/${eventoId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao visualizar evento")
      }

      toast({
        title: "Evento visualizado",
        description: "Detalhes do evento carregados com sucesso",
      })
    } catch (error) {
      console.error("Erro ao visualizar evento:", error)
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao visualizar evento"),
        variant: "destructive",
      })
    }
  }

  const duplicarEvento = async (eventoId: string) => {
    try {
      const response = await fetch("/api/esocial/duplicar-evento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          empresa_id: selectedCompany?.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao duplicar evento")
      }

      toast({
        title: "Sucesso",
        description: "Evento duplicado com sucesso!",
      })

      await carregarEventos()
    } catch (error) {
      console.error("Erro ao duplicar evento:", error)
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao duplicar evento"),
        variant: "destructive",
      })
    }
  }

  const excluirEvento = async (eventoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.")) {
      return
    }

    try {
      const response = await fetch(`/api/esocial/excluir-evento/${eventoId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao excluir evento")
      }

      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso!",
      })

      await carregarEventos()
    } catch (error) {
      console.error("Erro ao excluir evento:", error)
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao excluir evento"),
        variant: "destructive",
      })
    }
  }

  const baixarXML = async (eventoId: string) => {
    try {
      const response = await fetch(`/api/esocial/baixar-xml/${eventoId}`)
      
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Erro ao baixar XML")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `evento-${eventoId}.xml`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Sucesso",
        description: "XML baixado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao baixar XML:", error)
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao baixar XML"),
        variant: "destructive",
      })
    }
  }

  const reenviarEvento = async (eventoId: string) => {
    try {
      const response = await fetch("/api/esocial/reenviar-evento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          evento_id: eventoId,
          empresa_id: selectedCompany?.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao reenviar evento")
      }

      toast({
        title: "Sucesso",
        description: "Evento reenviado com sucesso!",
      })

      await carregarEventos()
    } catch (error) {
      console.error("Erro ao reenviar evento:", error)
      toast({
        title: "Erro",
        description: getFriendlyErrorMessage(error, "Erro ao reenviar evento"),
        variant: "destructive",
      })
    }
  }

  const eventosFiltrados = eventos.filter((evento) => {
    const matchTipo = filtroTipo === "todos" || evento.tipo_evento === filtroTipo
    const matchStatus = filtroStatus === "todos" || evento.status === filtroStatus
    const matchSearch = !searchTerm || 
      evento.funcionarios?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evento.funcionarios?.cpf.includes(searchTerm) ||
      evento.tipo_evento.toLowerCase().includes(searchTerm.toLowerCase())

    return matchTipo && matchStatus && matchSearch
  })

  const sanitizeCNPJ = (cnpj: string) => (cnpj || "").replace(/\D/g, "")

  const handleVerificarRepresentado = async () => {
    try {
      const cnpjDigits = sanitizeCNPJ(cnpjRepresentado)
      if (!cnpjDigits || cnpjDigits.length !== 14) {
        toast({ title: "CNPJ inválido", description: "Informe um CNPJ com 14 dígitos.", variant: "destructive" })
        return
      }
      setVerificandoRepresentado(true)
      const resp = await apiFetch(`/api/esocial/empresas-vinculadas?cnpj=${cnpjDigits}`, { method: "GET" })
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const d = json?.diagnostics || {}
        console.group("Diagnóstico empresas-vinculadas")
        console.error("error:", json?.error)
        console.log("hasRecord:", d.hasRecord)
        console.log("hasArquivoUrl:", d.hasArquivoUrl)
        console.log("hasArquivoBase64:", d.hasArquivoBase64)
        console.log("storageTried:", d.storageTried)
        console.log("storageError:", d.storageError)
        console.log("metaChecked:", d.metaChecked)
        console.log("metaFound:", d.metaFound)
        console.log("metaArquivoUrl:", d.metaArquivoUrl)
        console.log("directPathTried:", d.directPathTried)
        console.log("directPathError:", d.directPathError)
        console.log("pfxSource:", d.pfxSource)
        console.log("pfxBytesLength:", d.pfxBytesLength)
        console.log("senhaPresent:", d.senhaPresent)
        console.groupEnd()
        throw new Error(json?.error || "Falha na verificação do CNPJ representado")
      }
      if (json?.autorizado) {
        const emp = (json.empresas || [])[0]
        if (emp) {
          const mapped = {
            id: emp.id,
            name: emp.nome,
            cnpj: emp.cnpj || cnpjDigits,
            address: "",
            phone: "",
            email: "",
            logo: undefined,
            isActive: true,
            createdAt: new Date(),
          }
          setSelectedCompany(mapped)
          toast({ title: "Autorizado", description: `Perfil: ${perfilRepresentante}. CNPJ verificado.` })
        } else {
          toast({ title: "Autorizado", description: "CNPJ verificado. Nenhuma empresa cadastrada corresponde ao CNPJ.", variant: "default" })
        }
      } else {
        toast({ title: "Não autorizado", description: "O certificado não possui autorização para o CNPJ informado.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Erro ao verificar CNPJ representado:", error)
      toast({ title: "Erro", description: getFriendlyErrorMessage(error, "Falha ao verificar CNPJ representado"), variant: "destructive" })
    } finally {
      setVerificandoRepresentado(false)
    }
  }

  // Oculta a configuração de certificado após salvo; primeira conexão apenas se não houver certificado na conta
  return (
    <div className="space-y-6">
      {/* Seleção de perfil e CNPJ representado (fluxo eSocial) */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil e CNPJ Representado</CardTitle>
          <CardDescription>Selecione o perfil e informe o CNPJ representado para acessar o módulo SST.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <Label>Selecione o seu perfil</Label>
              <Select value={perfilRepresentante} onValueChange={(v) => setPerfilRepresentante(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Procurador de Pessoa Jurídica - CNPJ">Procurador de Pessoa Jurídica - CNPJ</SelectItem>
                  <SelectItem value="Empregador/Contribuinte">Empregador/Contribuinte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label>Informe o CNPJ representado</Label>
              <Input placeholder="00.000.000/0000-00" value={cnpjRepresentado} onChange={(e) => setCnpjRepresentado(e.target.value)} />
            </div>
            <div className="md:col-span-1 flex gap-2">
              <Button onClick={handleVerificarRepresentado} disabled={verificandoRepresentado}>
                {verificandoRepresentado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Verificar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Configuração de Certificado eSocial (somente se não houver certificado salvo) */}
      {!hasCertificadoConta && (
        <Card>
          <CardHeader>
            <CardTitle>Certificado eSocial</CardTitle>
            <CardDescription>
              Faça a primeira conexão via credencial (arquivo .p12/.pfx) e senha. Validaremos e salvaremos os dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-1">
                <Label htmlFor="certFile">Arquivo PKCS#12 (.p12/.pfx)</Label>
                <Input id="certFile" type="file" accept=".p12,.pfx" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="certPassword">Senha</Label>
                <Input id="certPassword" type="password" value={certPassword} onChange={(e) => setCertPassword(e.target.value)} />
              </div>
              <div className="md:col-span-1 flex gap-2">
                <Button onClick={handleUploadCertificado} disabled={certUploading}>
                  {certUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Validar e Salvar
                </Button>
              </div>
            </div>

            {certInfo && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <p className="text-sm text-muted-foreground break-all">{certInfo.subject}</p>
                </div>
                <div>
                  <Label>Emissor</Label>
                  <p className="text-sm text-muted-foreground break-all">{certInfo.issuer}</p>
                </div>
                <div>
                  <Label>Validade</Label>
                  <p className="text-sm text-muted-foreground">
                    {certInfo.validFrom && certInfo.validTo
                      ? `${format(certInfo.validFrom, "dd/MM/yyyy", { locale: ptBR })} até ${format(certInfo.validTo, "dd/MM/yyyy", { locale: ptBR })}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <Label>Tipo de Assinatura</Label>
                  <p className="text-sm text-muted-foreground">{certInfo.tipoAssinatura}</p>
                </div>
              </div>
            )}

            {(certInfo && !hasCertificadoConta) && (
              <div className="mt-6">
                <Label className="uppercase">SALVAR CERTIFICADO NA CONTA ?</Label>
                <div className="mt-2 flex gap-2">
                  <Button onClick={salvarCertificadoNaEmpresaSelecionada}>
                    <Send className="mr-2 h-4 w-4" />
                    SIM
                  </Button>
                  <Button variant="outline" onClick={() => { /* cancelar */ }}>
                    NÃO
                  </Button>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Aviso: a senha do certificado é armazenada para uso futuro. Recomenda-se proteger com criptografia/KMS em produção.
            </p>
          </CardContent>
        </Card>
      )}
      {!selectedCompany ? (
        null
      ) : (
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">eSocial</h1>
          <p className="text-muted-foreground">
            Geração e envio de eventos para o Sistema de Escrituração Digital das Obrigações Fiscais
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={consultarStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Consultar Status
          </Button>
          <Dialog open={showGerarDialog} onOpenChange={setShowGerarDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Gerar Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerar Novo Evento eSocial</DialogTitle>
                <DialogDescription>
                  Selecione o tipo de evento e os dados necessários
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tipo-evento">Tipo de Evento</Label>
                  <Select value={tipoEventoGerar} onValueChange={setTipoEventoGerar}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S-2220">S-2220 - Monitoramento da Saúde do Trabalhador</SelectItem>
                      <SelectItem value="S-2240">S-2240 - Condições Ambientais do Trabalho</SelectItem>
                      <SelectItem value="S-2210">S-2210 - Comunicação de Acidente de Trabalho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipoEventoGerar === "S-2220" && (
                  <div>
                    <Label htmlFor="exame">Exame ASO</Label>
                    <Select value={exameSelecionado} onValueChange={setExameSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um exame" />
                      </SelectTrigger>
                      <SelectContent>
                        {exames.map((exame) => (
                          <SelectItem key={exame.id} value={exame.id}>
                            {exame.funcionarios?.nome} - {exame.tipo_exame} ({format(new Date(exame.data_exame), "dd/MM/yyyy")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {tipoEventoGerar === "S-2240" && (
                  <div>
                    <Label htmlFor="funcionario">Funcionário</Label>
                    <Select value={funcionarioSelecionado} onValueChange={setFuncionarioSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {funcionarios.map((funcionario) => (
                          <SelectItem key={funcionario.id} value={funcionario.id}>
                            {funcionario.nome} - {funcionario.cpf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {tipoEventoGerar === "S-2210" && (
                  <div>
                    <Label htmlFor="incidente">Incidente</Label>
                    <Select value={incidenteSelecionado} onValueChange={setIncidenteSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um incidente" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentes.map((incidente) => (
                          <SelectItem key={incidente.id} value={incidente.id}>
                            {incidente.funcionarios?.nome} - {incidente.tipo_incidente} ({format(new Date(incidente.data_ocorrencia), "dd/MM/yyyy")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:space-x-2 justify-end">
                  <Button variant="outline" onClick={() => setShowGerarDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={gerarEvento} disabled={generatingEvent || !tipoEventoGerar}>
                    {generatingEvent && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Gerar Evento
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      )}

      {employeeSyncStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            {syncingEmployees && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            <span className="text-sm text-blue-800">{employeeSyncStatus}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="eventos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="eventos">
          <Card>
            <CardHeader>
              <CardTitle>Eventos eSocial</CardTitle>
              <CardDescription>
                Gerencie os eventos enviados para o eSocial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-4">
                <Input
                  placeholder="Buscar por funcionário, CPF ou tipo de evento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="S-2220">S-2220</SelectItem>
                    <SelectItem value="S-2240">S-2240</SelectItem>
                    <SelectItem value="S-2210">S-2210</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="preparando">Preparando</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="processado">Processado</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : eventosFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum evento encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventosFiltrados.map((evento) => (
                      <TableRow key={evento.id}>
                        <TableCell className="font-medium">{evento.tipo_evento}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{evento.funcionarios?.nome || "N/A"}</p>
                            <p className="text-sm text-muted-foreground">{evento.funcionarios?.cpf || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(evento.status)}</TableCell>
                        <TableCell className="font-mono text-sm">{evento.protocolo || "-"}</TableCell>
                        <TableCell>{format(new Date(evento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {evento.status === "preparando" && (
                              <Button
                                size="sm"
                                onClick={() => enviarEvento(evento.id)}
                                disabled={sendingEvent}
                              >
                                {sendingEvent ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => visualizarEvento(evento.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => baixarXML(evento.id)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar XML
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicarEvento(evento.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                {(evento.status === "erro" || evento.status === "rejeitado") && (
                                  <DropdownMenuItem onClick={() => reenviarEvento(evento.id)}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reenviar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => excluirEvento(evento.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lotes">
          <Card>
            <CardHeader>
              <CardTitle>Lotes de Eventos</CardTitle>
              <CardDescription>
                Acompanhe o processamento dos lotes enviados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lotes.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum lote encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número do Lote</TableHead>
                      <TableHead>Processados</TableHead>
                      <TableHead>Erros</TableHead>
                      <TableHead>Data Envio</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-mono">{lote.numero_lote}</TableCell>
                        <TableCell>{lote.eventos_processados}/{lote.total_eventos}</TableCell>
                        <TableCell>{lote.eventos_erro}</TableCell>
                        <TableCell>{format(new Date(lote.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell>{getStatusBadge(lote.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs do Sistema</CardTitle>
              <CardDescription>
                Histórico de operações e eventos do sistema eSocial
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum log encontrado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                      {getLogIcon(log.tipo)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getLogBadgeVariant(log.tipo)}>{log.tipo}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{log.mensagem}</p>
                        {log.detalhes && (
                          <p className="mt-1 text-xs text-muted-foreground">{log.detalhes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ESocial
