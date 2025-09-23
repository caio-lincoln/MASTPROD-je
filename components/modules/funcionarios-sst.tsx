"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { 
  Users, 
  RefreshCw, 
  Loader2, 
  Database,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Filter,
  Calendar,
  Shield,
  Activity,
  FileText,
  Search,
  TrendingUp
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
import { useToast } from "@/hooks/use-toast"
import { useCompany } from "@/contexts/company-context"
import { createClient } from "@/lib/supabase/client"

interface FuncionarioSST {
  cpf: string
  nome: string
  matricula: string
  cargo: string
  categoria: string
  origem_evento: "S-2210" | "S-2220" | "S-2240"
  detalhes: any
  data_evento: string
  numero_recibo?: string
}

interface EstatisticasSST {
  total_funcionarios: number
  por_evento: {
    "S-2210": number
    "S-2220": number
    "S-2240": number
  }
  periodo_consulta: {
    data_inicio: string
    data_fim: string
  }
}

interface SyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'error'
  message?: string
  lastSync?: string
  progress?: number
}

export function FuncionariosSST() {
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const supabase = createClient()

  console.log("FuncionariosSST - selectedCompany:", selectedCompany)
  console.log("FuncionariosSST - toast:", toast)
  console.log("FuncionariosSST - supabase:", supabase)

  const [funcionarios, setFuncionarios] = useState<FuncionarioSST[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasSST | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' })
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroEvento, setFiltroEvento] = useState("todos")
  const [dataInicio, setDataInicio] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3) // Últimos 3 meses por padrão
    return date.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])

  const [selectedFuncionario, setSelectedFuncionario] = useState<FuncionarioSST | null>(null)
  const [showDetalhes, setShowDetalhes] = useState(false)

  useEffect(() => {
    if (selectedCompany) {
      carregarFuncionariosSST()
    }
  }, [selectedCompany, filtroEvento, dataInicio, dataFim])

  const carregarFuncionariosSST = async (forceSync = false) => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        sincronizar: forceSync.toString()
      })

      if (filtroEvento !== "todos") {
        params.append("origem_evento", filtroEvento)
      }

      const response = await fetch(`/api/sst/empresas/${selectedCompany.cnpj}/funcionarios-sst?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar funcionários SST")
      }

      setFuncionarios(data.funcionarios || [])
      setEstatisticas(data.estatisticas)

      if (forceSync) {
        setSyncStatus({
          status: 'completed',
          message: `Sincronização concluída! ${data.funcionarios?.length || 0} funcionários encontrados`,
          lastSync: new Date().toLocaleString('pt-BR')
        })
      }

      toast({
        title: "Sucesso",
        description: `${data.funcionarios?.length || 0} funcionários SST carregados`,
      })

    } catch (error) {
      console.error("Erro ao carregar funcionários SST:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao carregar funcionários SST",
        variant: "destructive",
      })

      if (forceSync) {
        setSyncStatus({
          status: 'error',
          message: `Erro na sincronização: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        })
      }
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  const sincronizarEventosSST = async () => {
    setSyncing(true)
    setSyncStatus({
      status: 'syncing',
      message: 'Iniciando sincronização com eSocial...'
    })

    await carregarFuncionariosSST(true)
  }

  const exportarDados = async () => {
    try {
      const csvContent = [
        // Cabeçalho
        "CPF,Nome,Matrícula,Cargo,Categoria,Origem Evento,Data Evento,Detalhes",
        // Dados
        ...funcionariosFiltrados.map(f => [
          f.cpf,
          f.nome,
          f.matricula,
          f.cargo,
          f.categoria,
          f.origem_evento,
          format(new Date(f.data_evento), "dd/MM/yyyy"),
          JSON.stringify(f.detalhes).replace(/"/g, '""')
        ].join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `funcionarios-sst-${selectedCompany?.cnpj}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Sucesso",
        description: "Dados exportados com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao exportar dados",
        variant: "destructive",
      })
    }
  }

  const funcionariosFiltrados = funcionarios.filter((funcionario) => {
    const matchSearch = !searchTerm || 
      funcionario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      funcionario.cpf.includes(searchTerm) ||
      funcionario.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      funcionario.cargo.toLowerCase().includes(searchTerm.toLowerCase())

    return matchSearch
  })

  const getEventoBadgeColor = (evento: string) => {
    switch (evento) {
      case "S-2210": return "bg-red-100 text-red-800 border-red-200"
      case "S-2220": return "bg-blue-100 text-blue-800 border-blue-200"
      case "S-2240": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getEventoIcon = (evento: string) => {
    switch (evento) {
      case "S-2210": return <AlertTriangle className="h-4 w-4" />
      case "S-2220": return <Activity className="h-4 w-4" />
      case "S-2240": return <Shield className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getEventoDescricao = (evento: string) => {
    switch (evento) {
      case "S-2210": return "Comunicação de Acidente de Trabalho"
      case "S-2220": return "Monitoramento da Saúde do Trabalhador"
      case "S-2240": return "Condições Ambientais do Trabalho"
      default: return "Evento SST"
    }
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Selecione uma empresa para visualizar os funcionários SST</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Funcionários SST</h1>
          <p className="text-muted-foreground">
            Funcionários identificados através de eventos SST do eSocial (S-2210, S-2220, S-2240)
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportarDados} disabled={funcionarios.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={sincronizarEventosSST} disabled={syncing}>
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Status da Sincronização */}
      {syncStatus.status !== 'idle' && (
        <Card className={`border-l-4 ${
          syncStatus.status === 'completed' ? 'border-l-green-500 bg-green-50' :
          syncStatus.status === 'error' ? 'border-l-red-500 bg-red-50' :
          'border-l-blue-500 bg-blue-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              {syncStatus.status === 'syncing' && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
              {syncStatus.status === 'completed' && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              {syncStatus.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="font-medium">{syncStatus.message}</span>
            </div>
            
            {syncStatus.lastSync && (
              <div className="mt-2 text-xs text-muted-foreground">
                Última sincronização: {syncStatus.lastSync}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total_funcionarios}</div>
              <p className="text-xs text-muted-foreground">
                Período: {format(new Date(estatisticas.periodo_consulta.data_inicio), "dd/MM/yyyy")} - {format(new Date(estatisticas.periodo_consulta.data_fim), "dd/MM/yyyy")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acidentes (S-2210)</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{estatisticas.por_evento["S-2210"]}</div>
              <p className="text-xs text-muted-foreground">
                Comunicações de acidentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exames (S-2220)</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.por_evento["S-2220"]}</div>
              <p className="text-xs text-muted-foreground">
                Monitoramento de saúde
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exposições (S-2240)</CardTitle>
              <Shield className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{estatisticas.por_evento["S-2240"]}</div>
              <p className="text-xs text-muted-foreground">
                Agentes nocivos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, CPF, matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="evento">Tipo de Evento</Label>
              <Select value={filtroEvento} onValueChange={setFiltroEvento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os eventos</SelectItem>
                  <SelectItem value="S-2210">S-2210 - Acidentes</SelectItem>
                  <SelectItem value="S-2220">S-2220 - Exames</SelectItem>
                  <SelectItem value="S-2240">S-2240 - Exposições</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data-inicio">Data Início</Label>
              <Input
                id="data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="data-fim">Data Fim</Label>
              <Input
                id="data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Funcionários */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionários SST</CardTitle>
          <CardDescription>
            {funcionariosFiltrados.length} funcionários encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando funcionários...</span>
            </div>
          ) : funcionariosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum funcionário SST encontrado</p>
              <p className="text-sm text-muted-foreground mt-2">
                Tente ajustar os filtros ou sincronizar com o eSocial
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcionariosFiltrados.map((funcionario, index) => (
                  <TableRow key={`${funcionario.cpf}-${funcionario.origem_evento}-${index}`}>
                    <TableCell className="font-medium">{funcionario.nome}</TableCell>
                    <TableCell>{funcionario.cpf}</TableCell>
                    <TableCell>{funcionario.matricula}</TableCell>
                    <TableCell>{funcionario.cargo}</TableCell>
                    <TableCell>
                      <Badge className={getEventoBadgeColor(funcionario.origem_evento)}>
                        <div className="flex items-center space-x-1">
                          {getEventoIcon(funcionario.origem_evento)}
                          <span>{funcionario.origem_evento}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(funcionario.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFuncionario(funcionario)
                          setShowDetalhes(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Funcionário SST</DialogTitle>
            <DialogDescription>
              Informações detalhadas do evento {selectedFuncionario?.origem_evento}
            </DialogDescription>
          </DialogHeader>
          
          {selectedFuncionario && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedFuncionario.nome}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
                  <p className="font-medium">{selectedFuncionario.cpf}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Matrícula</Label>
                  <p className="font-medium">{selectedFuncionario.matricula}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cargo</Label>
                  <p className="font-medium">{selectedFuncionario.cargo}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                  <p className="font-medium">{selectedFuncionario.categoria}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data do Evento</Label>
                  <p className="font-medium">
                    {format(new Date(selectedFuncionario.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tipo de Evento</Label>
                <div className="mt-1">
                  <Badge className={getEventoBadgeColor(selectedFuncionario.origem_evento)}>
                    <div className="flex items-center space-x-2">
                      {getEventoIcon(selectedFuncionario.origem_evento)}
                      <span>{selectedFuncionario.origem_evento} - {getEventoDescricao(selectedFuncionario.origem_evento)}</span>
                    </div>
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Detalhes Específicos</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(selectedFuncionario.detalhes, null, 2)}
                  </pre>
                </div>
              </div>

              {selectedFuncionario.numero_recibo && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Número do Recibo</Label>
                  <p className="font-mono text-sm">{selectedFuncionario.numero_recibo}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FuncionariosSST