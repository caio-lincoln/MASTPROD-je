"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Filter, Search, User, Building, Clock, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCompany } from "@/contexts/company-context"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AuditLog {
  id: string
  acao: string
  entidade: string
  entidade_id: string
  descricao: string
  created_at: string
  usuario_email: string
  usuario_nome: string
  empresa_nome: string
  acao_formatada: string
  entidade_formatada: string
}

export function AuditLogs() {
  const { selectedCompany } = useCompany()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    entidade: "all",
    acao: "all",
    dataInicio: "",
    dataFim: "",
    busca: "",
  })

  const supabase = createClient()

  const loadLogs = async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc("get_logs_auditoria", {
        empresa_filter: selectedCompany.nome,
        entidade_filter: filters.entidade === "all" ? null : filters.entidade,
        acao_filter: filters.acao === "all" ? null : filters.acao,
        data_inicio: filters.dataInicio || null,
        data_fim: filters.dataFim || null,
        limite: 200,
      })

      if (error) throw error

      let filteredData = data || []

      // Filtro de busca local
      if (filters.busca) {
        filteredData = filteredData.filter(
          (log: AuditLog) =>
            log.descricao.toLowerCase().includes(filters.busca.toLowerCase()) ||
            log.usuario_email.toLowerCase().includes(filters.busca.toLowerCase()),
        )
      }

      setLogs(filteredData)
    } catch (error) {
      console.error("Erro ao carregar logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [selectedCompany, filters.entidade, filters.acao, filters.dataInicio, filters.dataFim])

  const handleSearch = () => {
    loadLogs()
  }

  const clearFilters = () => {
    setFilters({
      entidade: "all",
      acao: "all",
      dataInicio: "",
      dataFim: "",
      busca: "",
    })
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">Nenhuma empresa selecionada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione uma empresa para visualizar os logs de auditoria.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h2>
        <p className="text-muted-foreground">Histórico de ações realizadas no sistema para {selectedCompany.nome}</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Filtre os logs por tipo de ação, entidade ou período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="busca"
                  placeholder="Buscar por descrição ou usuário..."
                  value={filters.busca}
                  onChange={(e) => setFilters((prev) => ({ ...prev, busca: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entidade">Módulo</Label>
              <Select
                value={filters.entidade}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, entidade: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os módulos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos</SelectItem>
                  <SelectItem value="funcionario">👤 Funcionários</SelectItem>
                  <SelectItem value="nao_conformidade">⚠️ Não Conformidades</SelectItem>
                  <SelectItem value="exame_aso">🏥 Exames/ASO</SelectItem>
                  <SelectItem value="treinamento">📚 Treinamentos</SelectItem>
                  <SelectItem value="inspecao">🔍 Inspeções</SelectItem>
                  <SelectItem value="incidente">🚨 Incidentes</SelectItem>
                  <SelectItem value="epi">🦺 EPIs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acao">Ação</Label>
              <Select value={filters.acao} onValueChange={(value) => setFilters((prev) => ({ ...prev, acao: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="criar">✅ Criação</SelectItem>
                  <SelectItem value="editar">✏️ Edição</SelectItem>
                  <SelectItem value="excluir">🗑️ Exclusão</SelectItem>
                  <SelectItem value="visualizar">👁️ Visualização</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters((prev) => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters((prev) => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Histórico de Ações ({logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">Nenhum log encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Não há registros de auditoria para os filtros selecionados.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {log.acao_formatada}
                      </Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{log.entidade_formatada}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      <p className="text-sm text-foreground mb-2">{log.descricao}</p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.usuario_nome || log.usuario_email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {log.empresa_nome}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditLogs
