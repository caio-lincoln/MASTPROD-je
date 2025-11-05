"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Database,
  Plus,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Settings,
  Download,
  Upload,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Shield,
  Key,
  TestTube,
  Loader2,
  XCircle,
  Activity,
  History,
  Info,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

import { createClient } from "@/lib/supabase/client"
import { DigitalSignatureService } from "@/lib/esocial/digital-signature"
import { signXMLWithSupabaseCertificate } from "@/lib/esocial/xml-signer"
import { ESocialService } from "@/lib/esocial/esocial-service"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ESocialEvent {
  id: number
  evento: string
  descricao: string
  funcionario_nome: string
  funcionario_cpf: string
  data_evento: string
  data_envio: string | null
  status: "Enviado" | "Pendente" | "Erro"
  protocolo: string | null
  retorno: string | null
  empresa_id: string
}

interface EventType {
  codigo: string
  nome: string
  descricao: string
  obrigatorio: boolean
  prazo: string
  total: number
  enviados: number
  pendentes: number
  erros: number
  id: string
  versao: string
  layout_xml: string
  ativo: boolean
  created_at: string
  updated_at: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Enviado":
      return "default"
    case "Pendente":
      return "secondary"
    case "Erro":
      return "destructive"
    case "Processando":
      return "outline"
    default:
      return "secondary"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Enviado":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "Pendente":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "Erro":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "Processando":
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export function ESocialIntegration() {
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [selectedEvent, setSelectedEvent] = useState<ESocialEvent | null>(null)
  const [events, setEvents] = useState<ESocialEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loadingEventTypes, setLoadingEventTypes] = useState(false)
  const [selectedEventTypeForEdit, setSelectedEventTypeForEdit] = useState<any>(null)
  const [showEventTypeDialog, setShowEventTypeDialog] = useState(false)
  const [eventTypeForm, setEventTypeForm] = useState({
    codigo: "",
    nome: "",
    descricao: "",
    layout_xml: "",
    versao: "1.0",
    ativo: true,
  })

  // Estado para configuração global do eSocial
  const [globalConfig, setGlobalConfig] = useState<{
    certificateConfigured: boolean
    environment: string
    lastUpdate?: string
  }>({ certificateConfigured: false, environment: "producao" })

  const [testingConnection, setTestingConnection] = useState(false)
  const [processingEvents, setProcessingEvents] = useState(false)
  const [generatingEvents, setGeneratingEvents] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState<string>("")
  const [showEventGenerationDialog, setShowEventGenerationDialog] = useState(false)
  const [availableData, setAvailableData] = useState<{
    asos: any[]
    riscos: any[]
    incidentes: any[]
  }>({ asos: [], riscos: [], incidentes: [] })

  // Estados para sincronização de funcionários
  const [syncingEmployees, setSyncingEmployees] = useState(false)
  const [employeeSyncStatus, setEmployeeSyncStatus] = useState<{
    lastSync?: string
    status: 'idle' | 'syncing' | 'completed' | 'error'
    message?: string
    stats?: {
      processed: number
      new: number
      updated: number
    }
  }>({ status: 'idle' })
  const [employees, setEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  const supabase = createClient()

  const loadEventTypes = async () => {
    try {
      setLoadingEventTypes(true)

      // Load event types from database
      const { data: tiposEventos, error: tiposError } = await supabase
        .from("esocial_tipos_eventos")
        .select("*")
        .eq("ativo", true)
        .order("codigo")

      if (tiposError) throw tiposError

      // Calculate statistics for each event type
      const eventTypesWithStats = await Promise.all(
        (tiposEventos || []).map(async (tipo) => {
          const typeEvents = events.filter((event) => event.evento === tipo.codigo)
          const enviados = typeEvents.filter((event) => event.status === "Enviado").length
          const pendentes = typeEvents.filter((event) => event.status === "Pendente").length
          const erros = typeEvents.filter((event) => event.status === "Erro").length

          return {
            id: tipo.id,
            codigo: tipo.codigo,
            nome: tipo.nome,
            descricao: tipo.descricao,
            versao: tipo.versao,
            layout_xml: tipo.layout_xml,
            ativo: tipo.ativo,
            obrigatorio: ["S-2220", "S-2240", "S-2210"].includes(tipo.codigo), // Core events are mandatory
            prazo: getPrazoByEventType(tipo.codigo),
            total: typeEvents.length,
            enviados,
            pendentes,
            erros,
            created_at: tipo.created_at,
            updated_at: tipo.updated_at,
          }
        }),
      )

      setEventTypes(eventTypesWithStats)
    } catch (error) {
      console.error("Erro ao carregar tipos de eventos:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar tipos de eventos",
        variant: "destructive",
      })
    } finally {
      setLoadingEventTypes(false)
    }
  }

  const getPrazoByEventType = (codigo: string): string => {
    const prazos: Record<string, string> = {
      "S-2220": "Até o dia 15 do mês seguinte",
      "S-2240": "Até o dia 15 do mês seguinte",
      "S-2210": "Até o 1º dia útil seguinte",
      "S-2230": "Até o dia 15 do mês seguinte",
      "S-2250": "Até o dia 15 do mês seguinte",
    }
    return prazos[codigo] || "Conforme legislação"
  }

  const handleSaveEventType = async () => {
    if (!eventTypeForm.codigo || !eventTypeForm.nome) {
      toast({
        title: "Dados incompletos",
        description: "Código e nome são obrigatórios",
        variant: "destructive",
      })
      return
    }

    try {
      if (selectedEventTypeForEdit) {
        // Update existing event type
        const { error } = await supabase
          .from("esocial_tipos_eventos")
          .update({
            nome: eventTypeForm.nome,
            descricao: eventTypeForm.descricao,
            layout_xml: eventTypeForm.layout_xml,
            versao: eventTypeForm.versao,
            ativo: eventTypeForm.ativo,
          })
          .eq("id", selectedEventTypeForEdit.id)

        if (error) throw error

        toast({
          title: "Tipo de evento atualizado",
          description: `${eventTypeForm.codigo} foi atualizado com sucesso`,
        })
      } else {
        // Create new event type
        const { error } = await supabase.from("esocial_tipos_eventos").insert({
          codigo: eventTypeForm.codigo,
          nome: eventTypeForm.nome,
          descricao: eventTypeForm.descricao,
          layout_xml: eventTypeForm.layout_xml,
          versao: eventTypeForm.versao,
          ativo: eventTypeForm.ativo,
        })

        if (error) throw error

        toast({
          title: "Tipo de evento criado",
          description: `${eventTypeForm.codigo} foi criado com sucesso`,
        })
      }

      setShowEventTypeDialog(false)
      setSelectedEventTypeForEdit(null)
      setEventTypeForm({
        codigo: "",
        nome: "",
        descricao: "",
        layout_xml: "",
        versao: "1.0",
        ativo: true,
      })

      await loadEventTypes()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar tipo de evento",
        variant: "destructive",
      })
    }
  }

  const handleEditEventType = (eventType: any) => {
    setSelectedEventTypeForEdit(eventType)
    setEventTypeForm({
      codigo: eventType.codigo,
      nome: eventType.nome,
      descricao: eventType.descricao,
      layout_xml: eventType.layout_xml || "",
      versao: eventType.versao || "1.0",
      ativo: eventType.ativo,
    })
    setShowEventTypeDialog(true)
  }

  const handleToggleEventType = async (eventTypeId: string, ativo: boolean) => {
    try {
      const { error } = await supabase.from("esocial_tipos_eventos").update({ ativo }).eq("id", eventTypeId)

      if (error) throw error

      toast({
        title: ativo ? "Tipo de evento ativado" : "Tipo de evento desativado",
        description: "Status atualizado com sucesso",
      })

      await loadEventTypes()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do tipo de evento",
        variant: "destructive",
      })
    }
  }

  const loadEvents = async () => {
    if (!selectedCompany) {
      setEvents([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from("eventos_esocial")
        .select(`
          *,
          funcionarios (
            nome,
            cpf
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_evento", { ascending: false })

      if (supabaseError) throw supabaseError

      const transformedEvents: ESocialEvent[] = (data || []).map((event) => ({
        id: event.id,
        evento: event.tipo_evento,
        descricao: getEventDescription(event.tipo_evento),
        funcionario_nome: event.funcionarios?.nome || "N/A",
        funcionario_cpf: event.funcionarios?.cpf || "N/A",
        data_evento: event.data_evento,
        data_envio: event.data_envio,
        status: event.status as "Enviado" | "Pendente" | "Erro",
        protocolo: event.protocolo,
        retorno: event.retorno,
        empresa_id: event.empresa_id,
      }))

      setEvents(transformedEvents)
    } catch (err) {
      setError("Erro ao carregar eventos eSocial")
    } finally {
      setLoading(false)
    }
  }

  const getEventDescription = (tipoEvento: string): string => {
    const descriptions: Record<string, string> = {
      "S-2220": "Monitoramento da Saúde do Trabalhador",
      "S-2240": "Condições Ambientais do Trabalho - Agentes Nocivos",
      "S-2210": "Comunicação de Acidente de Trabalho",
    }
    return descriptions[tipoEvento] || tipoEvento
  }

  const getEventTypes = (events: ESocialEvent[]): EventType[] => {
    const eventTypes = [
      {
        codigo: "S-2220",
        nome: "Monitoramento da Saúde do Trabalhador",
        descricao: "Informações sobre exames médicos ocupacionais",
        obrigatorio: true,
        prazo: "Até o dia 15 do mês seguinte",
      },
      {
        codigo: "S-2240",
        nome: "Condições Ambientais do Trabalho",
        descricao: "Informações sobre agentes nocivos e fatores de risco",
        obrigatorio: true,
        prazo: "Até o dia 15 do mês seguinte",
      },
      {
        codigo: "S-2210",
        nome: "Comunicação de Acidente de Trabalho",
        descricao: "Registro de acidentes e doenças ocupacionais",
        obrigatorio: true,
        prazo: "Até o 1º dia útil seguinte",
      },
    ]

    return eventTypes
      .map((eventType) => {
        const typeEvents = events.filter((event) => event.evento === eventType.codigo)
        const enviados = typeEvents.filter((event) => event.status === "Enviado").length
        const pendentes = typeEvents.filter((event) => event.status === "Pendente").length
        const erros = typeEvents.filter((event) => event.status === "Erro").length

        return {
          ...eventType,
          total: typeEvents.length,
          enviados,
          id: `event-${eventType.codigo}`,
          versao: "1.0",
          layout_xml: "",
          ativo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          pendentes,
          erros,
        }
      })
      .filter((eventType) => eventType.total > 0)
  }

  const handleTestConnection = async () => {
    if (!selectedCompany) return

    setTestingConnection(true)
    try {
      const esocialService = new ESocialService()
      const result = await esocialService.testarConectividade(selectedCompany.id)

      if (result.conectado) {
        toast({
          title: "Conexão bem-sucedida",
          description: "Conectividade com eSocial verificada com sucesso",
        })
      } else {
        toast({
          title: "Erro na conexão",
          description: result.erro || "Falha ao conectar com eSocial",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro na conexão",
        description: "Falha ao testar conectividade",
        variant: "destructive",
      })
    } finally {
      setTestingConnection(false)
    }
  }

  // Carregar configuração global do eSocial
  const loadGlobalConfig = async () => {
    try {
      // Simular carregamento da configuração global
      // Em produção, isso viria da API de configurações
      setGlobalConfig({
        certificateConfigured: true,
        environment: "producao",
        lastUpdate: new Date().toLocaleDateString("pt-BR")
      })
    } catch (error) {
      console.error("Erro ao carregar configuração global:", error)
    }
  }

  const handleProcessEvents = async () => {
    if (!selectedCompany) return

    setProcessingEvents(true)
    try {
      const esocialService = new ESocialService()
      // Simular processamento automático
      const result = { sucesso: true, eventos_processados: 0 }

      toast({
        title: "Processamento iniciado",
        description: `${result.eventos_processados} eventos em processamento`,
      })

      // Recarregar eventos após processamento
      await loadEvents()
    } catch (err) {
      toast({
        title: "Erro no processamento",
        description: "Falha ao processar eventos",
        variant: "destructive",
      })
    } finally {
      setProcessingEvents(false)
    }
  }

  const handleGenerateEvent = async (tipoEvento: string) => {
    if (!selectedCompany) return

    try {
      const esocialService = new ESocialService()
      // Simular geração de eventos
      const result = { sucesso: true, eventos_gerados: 1, erro: null }

      if (result.sucesso) {
        toast({
          title: "Eventos gerados",
          description: `${result.eventos_gerados} eventos ${tipoEvento} criados`,
        })
        await loadEvents()
      } else {
        toast({
          title: "Erro na geração",
          description: result.erro || "Falha ao gerar eventos",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro na geração",
        description: "Falha ao gerar eventos",
        variant: "destructive",
      })
    }
  }

  const loadAvailableData = async () => {
    if (!selectedCompany) return

    try {
      // Load ASO exams for S-2220 events
      const { data: asos } = await supabase
        .from("exames_aso")
        .select(`
          *,
          funcionarios (
            id,
            nome,
            cpf,
            matricula
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .eq("resultado", "Apto")
        .is("evento_esocial_id", null) // Not yet sent to eSocial

      // Load risk assessments for S-2240 events
      const { data: riscos } = await supabase
        .from("riscos")
        .select(`
          *,
          funcionarios (
            id,
            nome,
            cpf,
            matricula
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .is("evento_esocial_id", null)

      // Load incidents for S-2210 events
      const { data: incidentes } = await supabase
        .from("incidentes")
        .select(`
          *,
          funcionarios (
            id,
            nome,
            cpf,
            matricula
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .is("evento_esocial_id", null)

      setAvailableData({
        asos: asos || [],
        riscos: riscos || [],
        incidentes: incidentes || [],
      })
    } catch (error) {
      console.error("Erro ao carregar dados disponíveis:", error)
    }
  }

  // Função para sincronizar funcionários
  const syncEmployees = async () => {
    if (!selectedCompany) return

    setSyncingEmployees(true)
    setEmployeeSyncStatus({ status: 'syncing', message: 'Iniciando sincronização...' })

    try {
      // Buscar funcionários da empresa
      const { data: funcionarios, error: funcionariosError } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("empresa_id", selectedCompany.id)

      if (funcionariosError) throw funcionariosError

      let processed = 0
      let newEmployees = 0
      let updatedEmployees = 0

      // Simular processamento de sincronização
      for (const funcionario of funcionarios || []) {
        setEmployeeSyncStatus({
          status: 'syncing',
          message: `Processando ${funcionario.nome}...`,
          stats: { processed, new: newEmployees, updated: updatedEmployees }
        })

        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verificar se funcionário já existe no eSocial
        const { data: existingEvent } = await supabase
          .from("eventos_esocial")
          .select("id")
          .eq("funcionario_cpf", funcionario.cpf)
          .eq("evento", "S-2200") // Admissão
          .single()

        if (!existingEvent) {
          // Criar evento de admissão S-2200
          const { error: eventError } = await supabase
            .from("eventos_esocial")
            .insert({
              evento: "S-2200",
              descricao: "Cadastramento Inicial do Vínculo e Admissão/Ingresso de Trabalhador",
              funcionario_nome: funcionario.nome,
              funcionario_cpf: funcionario.cpf,
              data_evento: funcionario.data_admissao || new Date().toISOString(),
              status: "Pendente",
              empresa_id: selectedCompany.id
            })

          if (!eventError) {
            newEmployees++
          }
        } else {
          updatedEmployees++
        }

        processed++
      }

      setEmployeeSyncStatus({
        status: 'completed',
        message: 'Sincronização concluída com sucesso!',
        stats: { processed, new: newEmployees, updated: updatedEmployees },
        lastSync: new Date().toLocaleString('pt-BR')
      })

      toast({
        title: "Sincronização concluída",
        description: `${newEmployees} novos funcionários, ${updatedEmployees} atualizados`,
      })

      // Recarregar eventos
      await loadEvents()

    } catch (error) {
      console.error("Erro na sincronização:", error)
      setEmployeeSyncStatus({
        status: 'error',
        message: 'Erro durante a sincronização'
      })
      toast({
        title: "Erro na sincronização",
        description: "Falha ao sincronizar funcionários",
        variant: "destructive",
      })
    } finally {
      setSyncingEmployees(false)
    }
  }

  // Função para carregar funcionários
  const loadEmployees = async () => {
    if (!selectedCompany) return

    setLoadingEmployees(true)
    try {
      const { data: funcionarios, error } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("nome")

      if (error) throw error
      setEmployees(funcionarios || [])
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error)
    } finally {
      setLoadingEmployees(false)
    }
  }

  const generateEventXML = async (eventType: string, data: any): Promise<string> => {
    const { data: tipoEvento, error } = await supabase
      .from("esocial_tipos_eventos")
      .select("layout_xml")
      .eq("codigo", eventType)
      .maybeSingle()

    if (error || !tipoEvento?.layout_xml) {
      throw new Error(`Layout XML não encontrado para evento ${eventType}`)
    }

    let xml = tipoEvento.layout_xml

    // Replace placeholders based on event type
    switch (eventType) {
      case "S-2220": // ASO
        xml = xml
          .replace(/<nrInsc><\/nrInsc>/, `<nrInsc>${selectedCompany?.cnpj || ''}</nrInsc>`)
          .replace(/<cpfTrab><\/cpfTrab>/, `<cpfTrab>${data.funcionarios.cpf}</cpfTrab>`)
          .replace(/<matricula><\/matricula>/, `<matricula>${data.funcionarios.matricula}</matricula>`)
          .replace(/<dtAso><\/dtAso>/, `<dtAso>${new Date(data.data_exame).toISOString().split("T")[0]}</dtAso>`)
          .replace(/<resAso>1<\/resAso>/, `<resAso>${data.resultado === "Apto" ? "1" : "2"}</resAso>`)
        break

      case "S-2240": // Risk exposure
        xml = xml
          .replace(/<nrInsc><\/nrInsc>/, `<nrInsc>${selectedCompany?.cnpj || ''}</nrInsc>`)
          .replace(/<cpfTrab><\/cpfTrab>/, `<cpfTrab>${data.funcionarios.cpf}</cpfTrab>`)
          .replace(/<matricula><\/matricula>/, `<matricula>${data.funcionarios.matricula}</matricula>`)
          .replace(
            /<dtIniCondicao><\/dtIniCondicao>/,
            `<dtIniCondicao>${new Date(data.data_identificacao).toISOString().split("T")[0]}</dtIniCondicao>`,
          )
          .replace(/<dscSetor><\/dscSetor>/, `<dscSetor>${data.setor}</dscSetor>`)
          .replace(/<dscAtivDes><\/dscAtivDes>/, `<dscAtivDes>${data.descricao}</dscAtivDes>`)
        break

      case "S-2210": // Accident
        xml = xml
          .replace(/<nrInsc><\/nrInsc>/, `<nrInsc>${selectedCompany?.cnpj || ''}</nrInsc>`)
          .replace(/<cpfTrab><\/cpfTrab>/, `<cpfTrab>${data.funcionarios.cpf}</cpfTrab>`)
          .replace(/<matricula><\/matricula>/, `<matricula>${data.funcionarios.matricula}</matricula>`)
          .replace(
            /<dtAcid><\/dtAcid>/,
            `<dtAcid>${new Date(data.data_ocorrencia).toISOString().split("T")[0]}</dtAcid>`,
          )
          .replace(/<hrAcid><\/hrAcid>/, `<hrAcid>${data.hora_ocorrencia || "0800"}</hrAcid>`)
          .replace(/<obsCAT><\/obsCAT>/, `<obsCAT>${data.descricao}</obsCAT>`)
        break
    }

    // Add unique ID
    const eventId = `ID${Date.now()}${Math.random().toString(36).substr(2, 9)}`
    xml = xml.replace(/Id=""/, `Id="${eventId}"`)

    return xml
  }

  const processEvents = async (eventType: string, selectedItems: any[]) => {
    if (!selectedCompany || !globalConfig.certificateConfigured) {
      toast({
        title: "Erro",
        description: "Empresa não selecionada ou certificado não configurado",
        variant: "destructive",
      })
      return
    }

    setProcessingEvents(true)

    try {
      const esocialService = new ESocialService()
      const processedEvents = []

      for (const item of selectedItems) {
        try {
          // Generate XML
          const rawXml = await generateEventXML(eventType, item)

          // Sign XML
          const signResult = await signXMLWithSupabaseCertificate({
            empresaId: selectedCompany.id,
            certPassword: "", // Senha será obtida da configuração global
            rawXml,
          })

          if (!signResult.success) {
            throw new Error(signResult.error)
          }

          // Save event to database
          const { data: evento, error: eventoError } = await supabase
            .from("eventos_esocial")
            .insert({
              empresa_id: selectedCompany.id,
              tipo_evento: eventType,
              funcionario_id: item.funcionarios.id,
              xml_original: rawXml,
              xml_assinado: signResult.signedXml,
              status: "pendente",
              criado_por: (await supabase.auth.getUser()).data.user?.id,
            })
            .select()
            .single()

          if (eventoError) throw eventoError

          // Send to eSocial
          const sendResult = await esocialService.processarEventoCompleto(
            evento.id,
            selectedCompany.id
          )

          // Update event status
          await supabase
            .from("eventos_esocial")
            .update({
              status: sendResult.sucesso ? "enviado" : "erro",
              protocolo_envio: sendResult.protocolo,
              data_envio: new Date().toISOString(),
              resposta_envio: sendResult.sucesso ? "Enviado com sucesso" : sendResult.erro,
              mensagem_erro: sendResult.erro,
            })
            .eq("id", evento.id)

          // Update source record
          const sourceTable = eventType === "S-2220" ? "exames_aso" : eventType === "S-2240" ? "riscos" : "incidentes"

          await supabase.from(sourceTable).update({ evento_esocial_id: evento.id }).eq("id", item.id)

          processedEvents.push({
            item: item.funcionarios.nome,
            success: sendResult.sucesso,
            protocolo: sendResult.protocolo,
            error: sendResult.erro,
          })
        } catch (error) {
          processedEvents.push({
            item: item.funcionarios.nome,
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
          })
        }
      }

      // Show results
      const successCount = processedEvents.filter((e) => e.success).length
      const errorCount = processedEvents.length - successCount

      toast({
        title: "Processamento Concluído",
        description: `${successCount} eventos enviados com sucesso, ${errorCount} com erro`,
        variant: successCount > errorCount ? "default" : "destructive",
      })

      // Reload events
      await loadEvents()
      await loadAvailableData()
    } catch (error) {
      toast({
        title: "Erro no Processamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setProcessingEvents(false)
      setShowEventGenerationDialog(false)
    }
  }

  const handleResendEventById = async (eventId: string) => {
    try {
      const { data: evento, error } = await supabase.from("eventos_esocial").select("*").eq("id", eventId).maybeSingle()

      if (error) {
        console.error("Erro ao buscar evento:", error)
        toast({
          title: "Erro",
          description: "Erro ao buscar dados do evento",
          variant: "destructive",
        })
        return
      }

      if (!evento) {
        toast({
          title: "Erro",
          description: "Evento não encontrado",
          variant: "destructive",
        })
        return
      }

      const esocialService = new ESocialService()
      const sendResult = await esocialService.processarEventoCompleto(
        evento.id,
        evento.empresa_id
      )

      await supabase
        .from("eventos_esocial")
        .update({
          status: sendResult.sucesso ? "enviado" : "erro",
          protocolo_envio: sendResult.protocolo,
          data_envio: new Date().toISOString(),
          resposta_envio: sendResult.sucesso ? "Enviado com sucesso" : sendResult.erro,
          mensagem_erro: sendResult.erro,
        })
        .eq("id", eventId)

      toast({
        title: sendResult.sucesso ? "Evento Reenviado" : "Erro no Reenvio",
        description: sendResult.sucesso ? `Protocolo: ${sendResult.protocolo}` : sendResult.erro,
        variant: sendResult.sucesso ? "default" : "destructive",
      })

      await loadEvents()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao reenviar evento",
        variant: "destructive",
      })
    }
  }

  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    environment: "Produção",
    lastCheck: null,
  })
  const [statistics, setStatistics] = useState({
    totalEvents: 0,
    successEvents: 0,
    errorEvents: 0,
    pendingEvents: 0,
    averageTime: 0,
  })
  const [activityLogs, setActivityLogs] = useState<any[]>([])

  const loadConnectionStatus = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("conectado, ambiente, ultima_verificacao")
        .eq("id", selectedCompany.id)
        .maybeSingle()

      if (error) {
        console.error("Erro ao carregar status da conexão:", error)
        setConnectionStatus({
          connected: false,
          environment: "producao",
          lastCheck: null,
        })
        return
      }

      if (data) {
        setConnectionStatus({
          connected: data.conectado || false,
          environment: data.ambiente || "producao",
          lastCheck: data.ultima_verificacao,
        })
      } else {
        setConnectionStatus({
          connected: false,
          environment: "producao",
          lastCheck: null,
        })
      }
    } catch (error) {
      console.error("Erro ao carregar status da conexão:", error)
      setConnectionStatus({
        connected: false,
        environment: "producao",
        lastCheck: null,
      })
    }
  }

  const loadStatistics = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("estatisticas_esocial")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .maybeSingle()

      if (error) {
        console.error("Erro ao carregar estatísticas:", error)
        // Se não há dados, criar estatísticas padrão
        setStatistics({
          totalEvents: 0,
          successEvents: 0,
          errorEvents: 0,
          pendingEvents: 0,
          averageTime: 0,
        })
        return
      }

      if (data) {
        setStatistics({
          totalEvents: data.total_eventos || 0,
          successEvents: data.sucesso_eventos || 0,
          errorEvents: data.erro_eventos || 0,
          pendingEvents: data.pendente_eventos || 0,
          averageTime: data.tempo_medio || 0,
        })
      } else {
        // Se não há dados, definir valores padrão
        setStatistics({
          totalEvents: 0,
          successEvents: 0,
          errorEvents: 0,
          pendingEvents: 0,
          averageTime: 0,
        })
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error)
      // Fallback para valores padrão em caso de erro
      setStatistics({
        totalEvents: 0,
        successEvents: 0,
        errorEvents: 0,
        pendingEvents: 0,
        averageTime: 0,
      })
    }
  }

  const loadActivityLogs = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("logs_esocial")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      setActivityLogs(data || [])
    } catch (error) {
      console.error("Erro ao carregar logs de atividade:", error)
    }
  }

  const formatDateSafe = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Data inválida"
    }
  }

  useEffect(() => {
    loadEvents()
    loadGlobalConfig()
    loadAvailableData()
    loadConnectionStatus()
    loadStatistics()
    loadActivityLogs()
    loadEmployees()
  }, [selectedCompany])

  useEffect(() => {
    if (events.length >= 0) {
      loadEventTypes()
    }
  }, [events])

  const eventTypesList = getEventTypes(events)
  const stats = {
    totalEvents: events.length,
    enviados: events.filter((event) => event.status === "Enviado").length,
    pendentes: events.filter((event) => event.status === "Pendente").length,
    erros: events.filter((event) => event.status === "Erro").length,
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <Database className="h-8 w-8" />
              <span>Integração eSocial</span>
            </h1>
            <p className="text-muted-foreground">Envio automático de eventos SST (S-2220, S-2240) para o eSocial</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
                <p className="text-muted-foreground">
                  Selecione uma empresa no menu superior para visualizar os eventos eSocial
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Integração eSocial</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando eventos eSocial...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Integração eSocial</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadEvents}>Tentar Novamente</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Database className="h-8 w-8" />
            <span>Integração eSocial</span>
          </h1>
          <p className="text-muted-foreground">
            Envio automático de eventos SST para o eSocial - {selectedCompany?.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
            <TestTube className="h-4 w-4 mr-2" />
            {testingConnection ? "Testando..." : "Testar Conexão"}
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Button onClick={handleProcessEvents} disabled={processingEvents}>
            <Send className="h-4 w-4 mr-2" />
            {processingEvents ? "Processando..." : "Processar Eventos"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="eventos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Evento</TabsTrigger>
          <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="eventos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enviados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.enviados}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEvents > 0 ? Math.round((stats.enviados / stats.totalEvents) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEvents > 0 ? Math.round((stats.pendentes / stats.totalEvents) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.erros}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEvents > 0 ? Math.round((stats.erros / stats.totalEvents) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Operações frequentes do eSocial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button
                  className="h-20 flex flex-col space-y-2"
                  onClick={() => setShowEventGenerationDialog(true)}
                  disabled={!globalConfig.certificateConfigured}
                >
                  <Send className="h-6 w-6" />
                  <span>Gerar Eventos</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col space-y-2 bg-transparent"
                  onClick={async () => {
                    setTestingConnection(true)
                    try {
                      const esocialService = new ESocialService()
                      const result = await esocialService.testarConectividade(selectedCompany.id)
                      toast({
                        title: result.conectado ? "Conexão OK" : "Erro de Conexão",
                        description: result.conectado ? `Ambiente: ${result.ambiente}` : result.erro,
                        variant: result.conectado ? "default" : "destructive",
                      })
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Erro ao testar conectividade",
                        variant: "destructive",
                      })
                    } finally {
                      setTestingConnection(false)
                    }
                  }}
                  disabled={testingConnection}
                >
                  <RefreshCw className={`h-6 w-6 ${testingConnection ? "animate-spin" : ""}`} />
                  <span>Consultar Status</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
                  <Download className="h-6 w-6" />
                  <span>Baixar Retornos</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
                  <Upload className="h-6 w-6" />
                  <span>Importar Dados</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Eventos eSocial</CardTitle>
              <CardDescription>Histórico de eventos enviados e pendentes de {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Input placeholder="Buscar por funcionário ou CPF..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="s2220">S-2220</SelectItem>
                      <SelectItem value="s2240">S-2240</SelectItem>
                      <SelectItem value="s2210">S-2210</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="erro">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Data do Evento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.evento}</div>
                            <div className="text-sm text-muted-foreground">{event.descricao}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.funcionario_nome}</div>
                            <div className="text-sm text-muted-foreground">{event.funcionario_cpf}</div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(event.data_evento).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.status === "Enviado"
                                ? "default"
                                : event.status === "Pendente"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.protocolo || "-"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedEvent(event)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              {event.status === "Erro" && (
                                <DropdownMenuItem onClick={() => handleResendEventById(event.id.toString())}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reenviar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar XML
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funcionarios" className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Sincronização de Funcionários</CardTitle>
                <CardDescription>
                  Sincronize os funcionários da empresa com o eSocial
                </CardDescription>
              </div>
              {/* Botão de sincronização removido conforme solicitado */}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status da Sincronização */}
              {employeeSyncStatus.status !== 'idle' && (
                <Card className={`border-l-4 ${
                  employeeSyncStatus.status === 'completed' ? 'border-l-green-500 bg-green-50' :
                  employeeSyncStatus.status === 'error' ? 'border-l-red-500 bg-red-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      {employeeSyncStatus.status === 'syncing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                      {employeeSyncStatus.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {employeeSyncStatus.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{employeeSyncStatus.message}</span>
                    </div>
                    
                    {employeeSyncStatus.stats && (
                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-lg">{employeeSyncStatus.stats.processed}</div>
                          <div className="text-muted-foreground">Processados</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-green-600">{employeeSyncStatus.stats.new}</div>
                          <div className="text-muted-foreground">Novos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg text-blue-600">{employeeSyncStatus.stats.updated}</div>
                          <div className="text-muted-foreground">Atualizados</div>
                        </div>
                      </div>
                    )}
                    
                    {employeeSyncStatus.lastSync && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Última sincronização: {employeeSyncStatus.lastSync}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Informações sobre Certificado */}
              {!globalConfig.certificateConfigured && (
                <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">Certificado não configurado</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Configure um certificado digital válido na aba "Certificados" para habilitar a sincronização.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Lista de Funcionários */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Funcionários da Empresa</CardTitle>
                  <CardDescription>
                    {employees.length} funcionários cadastrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingEmployees ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : employees.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {employees.map((funcionario) => (
                        <div
                          key={funcionario.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <div className="font-medium">{funcionario.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              CPF: {funcionario.cpf} | Matrícula: {funcionario.matricula}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {funcionario.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum funcionário encontrado
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Tipos de Eventos eSocial</CardTitle>
                <CardDescription>Configuração e status dos eventos SST de {selectedCompany.name}</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setSelectedEventTypeForEdit(null)
                  setEventTypeForm({
                    codigo: "",
                    nome: "",
                    descricao: "",
                    layout_xml: "",
                    versao: "1.0",
                    ativo: true,
                  })
                  setShowEventTypeDialog(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              {loadingEventTypes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando tipos de eventos...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {eventTypesList.map((eventType) => (
                      <Card key={eventType.codigo} className={!eventType.ativo ? "opacity-60" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-sm font-medium">{eventType.codigo}</CardTitle>
                              {eventType.obrigatorio && (
                                <Badge variant="secondary" className="text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                              {!eventType.ativo && (
                                <Badge variant="outline" className="text-xs">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditEventType(eventType)}>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateEvent(eventType.codigo)}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Gerar Eventos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleEventType(eventType.id, !eventType.ativo)}>
                                  {eventType.ativo ? (
                                    <>
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Ativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription className="text-xs">{eventType.nome}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xs text-muted-foreground mb-3">{eventType.descricao}</div>
                          <div className="text-xs text-muted-foreground mb-3">
                            <strong>Prazo:</strong> {eventType.prazo}
                          </div>
                          <div className="text-xs text-muted-foreground mb-3">
                            <strong>Versão:</strong> {eventType.versao}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-center p-2 bg-muted rounded">
                              <div className="font-medium">{eventType.total}</div>
                              <div className="text-muted-foreground">Total</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                              <div className="font-medium text-green-600">{eventType.enviados}</div>
                              <div className="text-muted-foreground">Enviados</div>
                            </div>
                            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                              <div className="font-medium text-yellow-600">{eventType.pendentes}</div>
                              <div className="text-muted-foreground">Pendentes</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded">
                              <div className="font-medium text-red-600">{eventType.erros}</div>
                              <div className="text-muted-foreground">Erros</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {eventTypesList.length === 0 && (
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum tipo de evento configurado</h3>
                      <p className="text-muted-foreground mb-4">
                        Configure os tipos de eventos eSocial para começar a enviar dados
                      </p>
                      <Button onClick={() => setShowEventTypeDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Primeiro Tipo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Types Management Table */}
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Tipos de Eventos</CardTitle>
              <CardDescription>Visualização detalhada e configuração avançada</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Eventos</TableHead>
                      <TableHead>Última Atualização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventTypesList.map((eventType) => (
                      <TableRow key={eventType.codigo}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{eventType.codigo}</span>
                            {eventType.obrigatorio && (
                              <Badge variant="secondary" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{eventType.nome}</div>
                            <div className="text-sm text-muted-foreground">{eventType.descricao}</div>
                          </div>
                        </TableCell>
                        <TableCell>{eventType.versao}</TableCell>
                        <TableCell>
                          <Badge variant={eventType.ativo ? "default" : "outline"}>
                            {eventType.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Total: {eventType.total}</div>
                            <div className="text-muted-foreground">
                              {eventType.enviados} enviados, {eventType.pendentes} pendentes, {eventType.erros} erros
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {eventType.updated_at ? new Date(eventType.updated_at).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditEventType(eventType)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Editar Configuração
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Ver Layout XML
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateEvent(eventType.codigo)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Gerar Eventos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleEventType(eventType.id, !eventType.ativo)}>
                                {eventType.ativo ? (
                                  <>
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoramento" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Status da Conexão</span>
                </CardTitle>
                <CardDescription>Monitoramento da conectividade com o eSocial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    connectionStatus.connected ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {connectionStatus.connected ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{connectionStatus.connected ? "Conexão Ativa" : "Conexão Inativa"}</p>
                      <p className="text-sm text-muted-foreground">
                        {connectionStatus.lastCheck
                          ? `Última verificação: ${formatDateSafe(connectionStatus.lastCheck)}`
                          : "Nunca testado"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
                    {connectionStatus.connected ? "Online" : "Offline"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ambiente:</span>
                    <span className="font-medium">{connectionStatus.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Versão do Layout:</span>
                    <span className="font-medium">S-1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificado Digital:</span>
                    <Badge variant={globalConfig.certificateConfigured ? "default" : "secondary"}>
                      {globalConfig.certificateConfigured ? "Configurado" : "Não configurado"}
                    </Badge>
                  </div>
                </div>

                <Button
                  className="w-full bg-transparent"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Envio</CardTitle>
                <CardDescription>Performance dos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {statistics.totalEvents > 0
                        ? `${((statistics.successEvents / statistics.totalEvents) * 100).toFixed(1)}%`
                        : "0%"}
                    </div>
                    <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {statistics.averageTime ? `${statistics.averageTime}s` : "0s"}
                    </div>
                    <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Eventos Enviados</span>
                    <span className="font-medium">{statistics.totalEvents.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sucessos</span>
                    <span className="font-medium text-green-600">{statistics.successEvents.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Erros</span>
                    <span className="font-medium text-red-600">{statistics.errorEvents.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pendentes</span>
                    <span className="font-medium text-yellow-600">{statistics.pendingEvents.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Log de Atividades</CardTitle>
              <CardDescription>Registro detalhado das operações eSocial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <div key={log.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      {log.tipo === "sucesso" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {log.tipo === "erro" && <XCircle className="h-4 w-4 text-red-500" />}
                      {log.tipo === "aviso" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {log.tipo === "info" && <Info className="h-4 w-4 text-blue-500" />}

                      <div className="flex-1">
                        <p className="font-medium">{log.descricao}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.detalhes && `${log.detalhes} • `}
                          {formatDateSafe(log.created_at)}
                        </p>
                      </div>

                      <Badge
                        variant={
                          log.tipo === "sucesso"
                            ? "default"
                            : log.tipo === "erro"
                              ? "destructive"
                              : log.tipo === "aviso"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {log.tipo === "sucesso"
                          ? "Sucesso"
                          : log.tipo === "erro"
                            ? "Erro"
                            : log.tipo === "aviso"
                              ? "Aviso"
                              : "Info"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma atividade registrada</p>
                  </div>
                )}
              </div>

              {activityLogs.length > 0 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" size="sm">
                    <History className="h-4 w-4 mr-2" />
                    Ver Histórico Completo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificados" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Configuração de Certificado Digital</span>
                </CardTitle>
                <CardDescription>
                  O certificado digital é configurado globalmente nas Configurações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {globalConfig.certificateConfigured ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <span className="font-medium">
                      {globalConfig.certificateConfigured ? "Certificado Configurado" : "Certificado Não Configurado"}
                    </span>
                  </div>
                  
                  {globalConfig.certificateConfigured && (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Ambiente: {globalConfig.environment}</p>
                      <p>Última atualização: {globalConfig.lastUpdate}</p>
                    </div>
                  )}
                  
                  {!globalConfig.certificateConfigured && (
                    <p className="text-sm text-muted-foreground">
                      Acesse Configurações → Integrações → eSocial para configurar o certificado digital
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Validação de Certificados</CardTitle>
              <CardDescription>Verificação de validade e configuração</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-center p-4 border rounded-lg">
                    <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="font-medium">Assinatura Digital</p>
                    <p className="text-sm text-muted-foreground">
                      {globalConfig.certificateConfigured ? "Configurada" : "Não configurada"}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Key className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <p className="font-medium">Ambiente</p>
                    <p className="text-sm text-muted-foreground">
                      {globalConfig.environment === "producao" ? "Produção" : "Homologação"}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => toast({ title: "Configuração Global", description: "Configure os certificados nas configurações globais do sistema." })}
                  disabled={!globalConfig.certificateConfigured}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Ir para Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Conexão</CardTitle>
                <CardDescription>Parâmetros de conexão com o eSocial para {selectedCompany.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Produção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Certificado Digital</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Certificado atual válido até 15/06/2025</p>
                    <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                      Alterar Certificado
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CNPJ da Empresa</Label>
                  <Input value={selectedCompany.cnpj || "12.345.678/0001-90"} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Versão do Layout</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="S-1.0" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="s1.0">S-1.0 (Atual)</SelectItem>
                      <SelectItem value="s1.1">S-1.1 (Beta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Envio</CardTitle>
                <CardDescription>Parâmetros para envio automático</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Envio Automático</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Habilitado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="habilitado">Habilitado</SelectItem>
                      <SelectItem value="desabilitado">Desabilitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horário de Envio</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>

                <div className="space-y-2">
                  <Label>Tamanho do Lote</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="50 eventos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 eventos</SelectItem>
                      <SelectItem value="50">50 eventos</SelectItem>
                      <SelectItem value="100">100 eventos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tentativas em Caso de Erro</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="3 tentativas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 tentativa</SelectItem>
                      <SelectItem value="3">3 tentativas</SelectItem>
                      <SelectItem value="5">5 tentativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>E-mail para Notificações</Label>
                  <Input placeholder="admin@empresa.com" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showEventTypeDialog} onOpenChange={setShowEventTypeDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedEventTypeForEdit ? "Editar Tipo de Evento" : "Novo Tipo de Evento"}</DialogTitle>
            <DialogDescription>Configure as informações e layout XML do tipo de evento eSocial</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label>Código do Evento</Label>
                <Input
                  value={eventTypeForm.codigo}
                  onChange={(e) => setEventTypeForm((prev) => ({ ...prev, codigo: e.target.value }))}
                  placeholder="Ex: S-2220"
                  disabled={!!selectedEventTypeForEdit}
                />
              </div>

              <div>
                <Label>Nome do Evento</Label>
                <Input
                  value={eventTypeForm.nome}
                  onChange={(e) => setEventTypeForm((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Monitoramento da Saúde do Trabalhador"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={eventTypeForm.descricao}
                  onChange={(e) => setEventTypeForm((prev) => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição detalhada do evento"
                />
              </div>

              <div>
                <Label>Versão</Label>
                <Input
                  value={eventTypeForm.versao}
                  onChange={(e) => setEventTypeForm((prev) => ({ ...prev, versao: e.target.value }))}
                  placeholder="1.0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={eventTypeForm.ativo}
                  onChange={(e) => setEventTypeForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                />
                <Label htmlFor="ativo">Evento ativo</Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Layout XML</Label>
                <textarea
                  className="w-full h-64 p-3 border rounded-md font-mono text-sm"
                  value={eventTypeForm.layout_xml}
                  onChange={(e) => setEventTypeForm((prev) => ({ ...prev, layout_xml: e.target.value }))}
                  placeholder="Cole aqui o layout XML do evento conforme especificação eSocial..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventTypeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEventType}>
              {selectedEventTypeForEdit ? "Atualizar" : "Criar"} Tipo de Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEventGenerationDialog} onOpenChange={setShowEventGenerationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Eventos eSocial</DialogTitle>
            <DialogDescription>Selecione os dados para gerar eventos automaticamente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Evento</Label>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S-2220">S-2220 - ASO (Exames Médicos)</SelectItem>
                  <SelectItem value="S-2240">S-2240 - Riscos Ocupacionais</SelectItem>
                  <SelectItem value="S-2210">S-2210 - Acidentes de Trabalho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedEventType && (
              <div className="space-y-2">
                <Label>Dados Disponíveis</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {selectedEventType === "S-2220" && availableData.asos.length > 0 && (
                    <div className="space-y-2">
                      {availableData.asos.map((aso) => (
                        <div key={aso.id} className="flex items-center space-x-2">
                          <input type="checkbox" id={`aso-${aso.id}`} />
                          <label htmlFor={`aso-${aso.id}`} className="text-sm">
                            {aso.funcionarios?.nome} - ASO {aso.tipo_exame} (
                            {new Date(aso.data_exame).toLocaleDateString("pt-BR")})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedEventType === "S-2240" && availableData.riscos.length > 0 && (
                    <div className="space-y-2">
                      {availableData.riscos.map((risco) => (
                        <div key={risco.id} className="flex items-center space-x-2">
                          <input type="checkbox" id={`risco-${risco.id}`} />
                          <label htmlFor={`risco-${risco.id}`} className="text-sm">
                            {risco.funcionarios?.nome} - {risco.tipo_risco} ({risco.setor})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedEventType === "S-2210" && availableData.incidentes.length > 0 && (
                    <div className="space-y-2">
                      {availableData.incidentes.map((incidente) => (
                        <div key={incidente.id} className="flex items-center space-x-2">
                          <input type="checkbox" id={`incidente-${incidente.id}`} />
                          <label htmlFor={`incidente-${incidente.id}`} className="text-sm">
                            {incidente.funcionarios?.nome} - {incidente.tipo_incidente} (
                            {new Date(incidente.data_ocorrencia).toLocaleDateString("pt-BR")})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {((selectedEventType === "S-2220" && availableData.asos.length === 0) ||
                    (selectedEventType === "S-2240" && availableData.riscos.length === 0) ||
                    (selectedEventType === "S-2210" && availableData.incidentes.length === 0)) && (
                    <p className="text-muted-foreground text-sm">Nenhum dado disponível para este tipo de evento</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Configuração de Certificado</Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {globalConfig.certificateConfigured 
                    ? "Certificado configurado nas configurações globais" 
                    : "Configure o certificado nas configurações globais do sistema"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventGenerationDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const selectedItems: any[] = []
                // Logic to get selected items would go here
                processEvents(selectedEventType, selectedItems)
              }}
              disabled={!selectedEventType || !globalConfig.certificateConfigured || processingEvents}
            >
              {processingEvents ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Gerar e Enviar Eventos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ESocialIntegration
