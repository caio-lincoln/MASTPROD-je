"use client"

import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Plus, Edit, Eye, AlertTriangle, CheckCircle, Upload, Download, FileText } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { FileUpload } from "@/components/ui/file-upload"
import { uploadPGR, getSignedUrl } from "@/lib/supabase/storage"

interface Risk {
  id: number
  setor: string
  risco: string
  probabilidade: string
  severidade: string
  nivel_risco: number
  status: string
  descricao?: string
  medidas_controle?: string
  responsavel?: string
  created_at: string
  empresa_id: string
}

interface ActionPlan {
  id: number
  titulo: string
  descricao: string
  prazo_implementacao: string
  responsavel: string
  status: string
  empresa_id: string
}

const getRiskColor = (nivel_risco: number) => {
  if (nivel_risco >= 15) {
    return "bg-red-500"
  } else if (nivel_risco >= 6) {
    return "bg-yellow-500"
  } else {
    return "bg-green-500"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pendente":
    case "em_andamento":
      return "destructive"
    case "concluido":
      return "default"
    default:
      return "secondary"
  }
}

export function RiskManagement() {
  const [risks, setRisks] = useState<Risk[]>([])
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRisk, setSelectedRisk] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<any>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadingPGR, setUploadingPGR] = useState(false)
  const [pgrFiles, setPgrFiles] = useState<any[]>([])
  const [editFormData, setEditFormData] = useState({
    setor: "",
    risco: "",
    probabilidade: "",
    severidade: "",
    descricao: "",
    medidasControle: "",
    responsavel: "",
  })
  
  // Estados para o formulário de novo risco
  const [newRiskForm, setNewRiskForm] = useState({
    setor: "",
    funcao: "",
    risco: "",
    probabilidade: "",
    severidade: "",
    medidas: "",
  })
  const { selectedCompany } = useCompany()
  const supabase = createBrowserClient()

  const loadRisks = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)
      const { data: risksData, error: risksError } = await supabase
        .from("gestao_riscos")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (risksError) throw risksError

      const { data: plansData, error: plansError } = await supabase
        .from("planos_acao")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("prazo_implementacao", { ascending: true })

      if (plansError) throw plansError

      const { data: filesData, error: filesError } = await supabase.storage.from("pgr").list(selectedCompany.id)

      if (!filesError && filesData) {
        setPgrFiles(filesData)
      }

      setRisks(risksData || [])
      setActionPlans(plansData || [])
    } catch (error) {
      console.error("Erro ao carregar riscos:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPGRFiles = async () => {
    if (!selectedCompany) return

    try {
      const { data: filesData, error: filesError } = await supabase.storage.from("pgr").list(selectedCompany.id)

      if (!filesError && filesData) {
        setPgrFiles(filesData)
      }
    } catch (error) {
      console.error("Erro ao carregar arquivos PGR:", error)
    }
  }

  useEffect(() => {
    loadRisks()
  }, [selectedCompany])

  const riskStats = {
    total: risks.length,
    alto: risks.filter((r) => r && typeof r.nivel_risco === "number" && r.nivel_risco >= 15).length,
    medio: risks.filter((r) => r && typeof r.nivel_risco === "number" && r.nivel_risco >= 6 && r.nivel_risco < 15)
      .length,
    baixo: risks.filter((r) => r && typeof r.nivel_risco === "number" && r.nivel_risco < 6).length,
    ativo: risks.filter((r) => r && (r.status === "pendente" || r.status === "em_andamento")).length,
    controlado: risks.filter((r) => r && r.status === "concluido").length,
  }

  const handleUploadPGR = async (files: File[]) => {
    if (!selectedCompany || files.length === 0) return

    try {
      setUploadingPGR(true)
      const file = files[0]
      const timestamp = new Date().toISOString().split("T")[0]
      const companyName =
        selectedCompany?.name && typeof selectedCompany.name === "string"
          ? selectedCompany.name.replace(/[^a-zA-Z0-9]/g, "_")
          : "empresa"
      const fileName = `PGR_${companyName}_${timestamp}.pdf`

      const result = await uploadPGR(file, selectedCompany.id, fileName)

      if (result && !result.error) {
        await supabase.from("logs_gerais").insert({
          empresa_id: selectedCompany.id,
          modulo: "gestao_riscos",
          acao: "upload_pgr",
          descricao: `Upload de documento PGR: ${fileName}`,
          arquivo_url: result.publicUrl,
        })

        await loadPGRFiles()
        setIsUploadDialogOpen(false)
      }
    } catch (error) {
      console.error("Erro no upload do PGR:", error)
    } finally {
      setUploadingPGR(false)
    }
  }

  const handleDownloadPGR = async (fileName: string) => {
    if (!selectedCompany) return

    try {
      const signedUrl = await getSignedUrl(`${selectedCompany.id}/${fileName}`, "pgr", 3600)
      if (signedUrl) {
        window.open(signedUrl, "_blank")
      }
    } catch (error) {
      console.error("Erro ao baixar PGR:", error)
    }
  }

  const handleViewRisk = (risk: any) => {
    setSelectedRisk(risk)
    setIsViewDialogOpen(true)
  }

  const handleEditRisk = (risk: any) => {
    setEditingRisk(risk)
    setEditFormData({
      setor: risk.setor,
      risco: risk.risco,
      probabilidade: risk.probabilidade,
      severidade: risk.severidade,
      descricao: risk.descricao || "",
      medidasControle: risk.medidas_controle || "",
      responsavel: risk.responsavel || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveRisk = async () => {
    if (!editingRisk || !selectedCompany) return

    try {
      const { error } = await supabase
        .from("gestao_riscos")
        .update({
          setor: editFormData.setor,
          risco: editFormData.risco,
          probabilidade: editFormData.probabilidade,
          severidade: editFormData.severidade,
          descricao: editFormData.descricao,
          medidas_controle: editFormData.medidasControle,
          responsavel: editFormData.responsavel,
          nivel_risco: calculateRiskLevel(editFormData.probabilidade, editFormData.severidade),
        })
        .eq("id", editingRisk.id)

      if (error) throw error

      await loadRisks()
      setIsEditDialogOpen(false)
      setEditingRisk(null)
    } catch (error) {
      console.error("Erro ao salvar risco:", error)
    }
  }

  const calculateRiskLevel = (probabilidade: string, severidade: string): number => {
    const probValue = probabilidade === "Alta" || probabilidade === "alta" ? 3 : 
                     probabilidade === "Média" || probabilidade === "media" ? 2 : 1
    const sevValue = severidade === "Alta" || severidade === "alta" ? 3 : 
                    severidade === "Média" || severidade === "media" ? 2 : 1
    return probValue * sevValue
  }

  const getRiskLevelText = (nivel: number): string => {
    if (nivel >= 6) return "Alto"
    if (nivel >= 3) return "Médio"
    return "Baixo"
  }

  const getRiskLevelColor = (nivel: number): string => {
    if (nivel >= 6) return "text-red-600 font-semibold"
    if (nivel >= 3) return "text-yellow-600 font-semibold"
    return "text-green-600 font-semibold"
  }

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false)
    setEditingRisk(null)
    setEditFormData({
      setor: "",
      risco: "",
      probabilidade: "",
      severidade: "",
      descricao: "",
      medidasControle: "",
      responsavel: "",
    })
  }

  const clearNewRiskForm = () => {
    setNewRiskForm({
      setor: "",
      funcao: "",
      risco: "",
      probabilidade: "",
      severidade: "",
      medidas: "",
    })
  }

  const handleSaveNewRisk = async () => {
    if (!selectedCompany || !newRiskForm.setor || !newRiskForm.risco || !newRiskForm.probabilidade || !newRiskForm.severidade) {
      alert("Por favor, preencha todos os campos obrigatórios")
      return
    }

    try {
      const nivelRisco = calculateRiskLevel(newRiskForm.probabilidade, newRiskForm.severidade)
      
      const { error } = await supabase
        .from('risks')
        .insert({
          empresa_id: selectedCompany.id,
          setor: newRiskForm.setor,
          risco: newRiskForm.risco,
          probabilidade: newRiskForm.probabilidade,
          severidade: newRiskForm.severidade,
          nivel_risco: nivelRisco,
          descricao: newRiskForm.funcao,
          medidas_controle: newRiskForm.medidas,
          status: 'ativo'
        })

      if (error) throw error

      await loadRisks()
      clearNewRiskForm()
      alert("Risco cadastrado com sucesso!")
    } catch (error) {
      console.error("Erro ao salvar risco:", error)
      alert("Erro ao salvar risco. Tente novamente.")
    }
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para continuar</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            <span>Gestão de Riscos (PGR)</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Programa de Gerenciamento de Riscos - NR-01 | {selectedCompany.name}
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando riscos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="leading-tight">Gestão de Riscos (PGR)</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Programa de Gerenciamento de Riscos - NR-01 | {selectedCompany.name}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Risco
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Risco</DialogTitle>
              <DialogDescription>
                Adicione um novo risco ao inventário do PGR para {selectedCompany.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setor">Setor</Label>
                  <Select value={newRiskForm.setor} onValueChange={(value) => setNewRiskForm(prev => ({...prev, setor: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                      <SelectItem value="escritorio">Escritório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funcao">Função</Label>
                  <Input 
                    placeholder="Ex: Operador de máquina" 
                    value={newRiskForm.funcao}
                    onChange={(e) => setNewRiskForm(prev => ({...prev, funcao: e.target.value}))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="risco">Descrição do Risco</Label>
                <Textarea 
                  placeholder="Descreva detalhadamente o risco identificado" 
                  className="min-h-[80px]"
                  value={newRiskForm.risco}
                  onChange={(e) => setNewRiskForm(prev => ({...prev, risco: e.target.value}))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Probabilidade</Label>
                  <Select value={newRiskForm.probabilidade} onValueChange={(value) => setNewRiskForm(prev => ({...prev, probabilidade: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severidade</Label>
                  <Select value={newRiskForm.severidade} onValueChange={(value) => setNewRiskForm(prev => ({...prev, severidade: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nível de Risco</Label>
                  <Input 
                    value={newRiskForm.probabilidade && newRiskForm.severidade ? 
                      `${getRiskLevelText(calculateRiskLevel(newRiskForm.probabilidade, newRiskForm.severidade))} (${calculateRiskLevel(newRiskForm.probabilidade, newRiskForm.severidade)})` : 
                      "Selecione probabilidade e severidade"} 
                    disabled 
                    className={newRiskForm.probabilidade && newRiskForm.severidade ? 
                      getRiskLevelColor(calculateRiskLevel(newRiskForm.probabilidade, newRiskForm.severidade)) : 
                      ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medidas">Medidas de Controle</Label>
                <Textarea
                  placeholder="Descreva as medidas de controle implementadas ou planejadas"
                  className="min-h-[80px]"
                  value={newRiskForm.medidas}
                  onChange={(e) => setNewRiskForm(prev => ({...prev, medidas: e.target.value}))}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" className="w-full sm:w-auto bg-transparent" onClick={clearNewRiskForm}>
                Cancelar
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleSaveNewRisk}>
                Salvar Risco
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Riscos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{riskStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riscos Altos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{riskStats.alto}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riscos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{riskStats.ativo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Controlados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{riskStats.controlado}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matriz" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="matriz" className="text-xs sm:text-sm">
              Matriz de Riscos
            </TabsTrigger>
            <TabsTrigger value="inventario" className="text-xs sm:text-sm">
              Inventário
            </TabsTrigger>
            <TabsTrigger value="planos" className="text-xs sm:text-sm">
              Planos de Ação
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs sm:text-sm">
              Relatórios
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="matriz" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Matriz de Riscos Dinâmica</CardTitle>
              <CardDescription className="text-sm">
                Visualização interativa dos riscos por probabilidade e severidade - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[320px] grid grid-cols-4 gap-2 mb-6">
                  <div></div>
                  <div className="text-center font-medium text-xs sm:text-sm">Baixa</div>
                  <div className="text-center font-medium text-xs sm:text-sm">Média</div>
                  <div className="text-center font-medium text-xs sm:text-sm">Alta</div>

                  <div className="font-medium text-xs sm:text-sm">Alta</div>
                  <div className="h-16 sm:h-20 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Médio
                  </div>
                  <div className="h-16 sm:h-20 bg-red-100 dark:bg-red-900 border-2 border-red-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Alto ({risks.filter((r) => r && r.probabilidade === "Alta" && r.severidade === "Média").length})
                  </div>
                  <div className="h-16 sm:h-20 bg-red-100 dark:bg-red-900 border-2 border-red-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Alto ({risks.filter((r) => r && r.probabilidade === "Alta" && r.severidade === "Alta").length})
                  </div>

                  <div className="font-medium text-xs sm:text-sm">Média</div>
                  <div className="h-16 sm:h-20 bg-green-100 dark:bg-green-900 border-2 border-green-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Baixo ({risks.filter((r) => r && r.probabilidade === "Média" && r.severidade === "Baixa").length})
                  </div>
                  <div className="h-16 sm:h-20 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Médio
                  </div>
                  <div className="h-16 sm:h-20 bg-red-100 dark:bg-red-900 border-2 border-red-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Alto ({risks.filter((r) => r && r.probabilidade === "Média" && r.severidade === "Alta").length})
                  </div>

                  <div className="font-medium text-xs sm:text-sm">Baixa</div>
                  <div className="h-16 sm:h-20 bg-green-100 dark:bg-green-900 border-2 border-green-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Baixo
                  </div>
                  <div className="h-16 sm:h-20 bg-green-100 dark:bg-green-900 border-2 border-green-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Baixo
                  </div>
                  <div className="h-16 sm:h-20 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Médio ({risks.filter((r) => r && r.probabilidade === "Baixa" && r.severidade === "Alta").length})
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <span className="font-medium">Severidade →</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Inventário de Riscos</CardTitle>
              <CardDescription className="text-sm">
                Lista completa de todos os riscos identificados - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setor</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Probabilidade</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {risks.map((risk) => (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium">{risk.setor}</TableCell>
                        <TableCell>{risk.risco}</TableCell>
                        <TableCell>{risk.probabilidade}</TableCell>
                        <TableCell>{risk.severidade}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getRiskColor(risk.nivel_risco)}`} />
                            <span>{risk.nivel_risco}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(risk.status) as any}>{risk.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewRisk(risk)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditRisk(risk)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="sm:hidden space-y-3">
                {risks.map((risk) => (
                  <Card key={risk.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(risk.nivel_risco)}`} />
                        <span className="font-medium text-sm">{risk.setor}</span>
                      </div>
                      <Badge variant={getStatusColor(risk.status) as any} className="text-xs">
                        {risk.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-2">{risk.risco}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                      <div>Prob: {risk.probabilidade}</div>
                      <div>Sev: {risk.severidade}</div>
                      <div>Nível: {risk.nivel_risco}</div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleViewRisk(risk)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleEditRisk(risk)}>
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {risks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum risco cadastrado para {selectedCompany.name}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  <span>Planos de Ação - {selectedCompany.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {actionPlans
                  .filter((plan) => plan.status !== "Concluído")
                  .map((plan) => (
                    <div key={plan.id} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{plan.titulo}</h4>
                        <Badge
                          variant={plan.status === "Vencido" ? "destructive" : "secondary"}
                          className="text-xs w-fit"
                        >
                          {plan.status}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">{plan.descricao}</p>
                      <div className="text-xs text-muted-foreground">
                        Prazo: {plan.prazo_implementacao} | Responsável: {plan.responsavel}
                      </div>
                    </div>
                  ))}
                {actionPlans.filter((plan) => plan.status !== "Concluído").length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">Nenhum plano de ação pendente</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span>Planos Concluídos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {actionPlans
                  .filter((plan) => plan.status === "Concluído")
                  .map((plan) => (
                    <div key={plan.id} className="p-3 sm:p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{plan.titulo}</h4>
                        <Badge className="text-xs w-fit">Concluído</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">{plan.descricao}</p>
                      <div className="text-xs text-muted-foreground">Concluído em: {plan.prazo_implementacao}</div>
                    </div>
                  ))}
                {actionPlans.filter((plan) => plan.status === "Concluído").length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">Nenhum plano concluído ainda</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Documentos PGR - {selectedCompany.name}</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Gerencie os documentos do Programa de Gerenciamento de Riscos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload PGR
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload de Documento PGR</DialogTitle>
                      <DialogDescription>
                        Faça upload do documento PGR em formato PDF para {selectedCompany.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <FileUpload
                        type="pgr"
                        onUploadComplete={(url, path) => {
                          // Handle upload completion
                          console.log("Upload completed:", url, path)
                        }}
                        onUploadError={(error) => {
                          console.error("Upload error:", error)
                        }}
                        maxFiles={1}
                        maxSizeMB={50}
                        accept="application/pdf"
                      />
                      {uploadingPGR && (
                        <div className="mt-4 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Fazendo upload...</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar PGR Automático
                </Button>
              </div>

              <div className="space-y-3">
                {pgrFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.created_at && typeof file.created_at === "string"
                            ? new Date(file.created_at).toLocaleDateString("pt-BR")
                            : "Data não disponível"}{" "}
                          •{" "}
                          {file.metadata?.size && typeof file.metadata.size === "number"
                            ? Math.round(file.metadata.size / 1024 / 1024)
                            : file.metadata?.size && typeof file.metadata.size === "string"
                              ? Math.round(Number(file.metadata.size) / 1024 / 1024) || 0
                              : 0}{" "}
                          MB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadPGR(file.name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {pgrFiles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum documento PGR encontrado. Faça upload do primeiro documento.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Relatório PGR Completo</CardTitle>
                <CardDescription className="text-sm">
                  Documento completo do Programa de Gerenciamento de Riscos - {selectedCompany.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Gerar Relatório</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Matriz por Setor</CardTitle>
                <CardDescription className="text-sm">
                  Relatório específico de riscos por área da empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline">
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Planos de Ação</CardTitle>
                <CardDescription className="text-sm">Status e cronograma das ações preventivas</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline">
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {selectedRisk && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Risco</DialogTitle>
              <DialogDescription>Informações completas do risco identificado</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setor:</span>
                      <span className="font-medium">{selectedRisk.setor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Probabilidade:</span>
                      <span>{selectedRisk.probabilidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Severidade:</span>
                      <span>{selectedRisk.severidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nível de Risco:</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(selectedRisk.nivel_risco)}`} />
                        <span className="font-medium">{selectedRisk.nivel_risco}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedRisk.status) as any}>{selectedRisk.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responsável:</span>
                      <span>{selectedRisk.responsavel}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Descrição do Risco</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRisk.descricao}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medidas de Controle</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedRisk.medidasControle}</p>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    handleEditRisk(selectedRisk)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Risco
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editingRisk && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Risco</DialogTitle>
              <DialogDescription>Atualize as informações do risco "{editingRisk.risco}"</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select
                    value={editFormData.setor}
                    onValueChange={(value) => setEditFormData({ ...editFormData, setor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Produção">Produção</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Almoxarifado">Almoxarifado</SelectItem>
                      <SelectItem value="Escritório">Escritório</SelectItem>
                      <SelectItem value="Laboratório">Laboratório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input
                    value={editFormData.responsavel}
                    onChange={(e) => setEditFormData({ ...editFormData, responsavel: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição do Risco</Label>
                <Input
                  value={editFormData.risco}
                  onChange={(e) => setEditFormData({ ...editFormData, risco: e.target.value })}
                  placeholder="Descrição breve do risco"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição Detalhada</Label>
                <Textarea
                  value={editFormData.descricao}
                  onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
                  placeholder="Descreva detalhadamente o risco identificado"
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Probabilidade</Label>
                  <Select
                    value={editFormData.probabilidade}
                    onValueChange={(value) => setEditFormData({ ...editFormData, probabilidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severidade</Label>
                  <Select
                    value={editFormData.severidade}
                    onValueChange={(value) => setEditFormData({ ...editFormData, severidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Medidas de Controle</Label>
                <Textarea
                  value={editFormData.medidasControle}
                  onChange={(e) => setEditFormData({ ...editFormData, medidasControle: e.target.value })}
                  placeholder="Descreva as medidas de controle implementadas ou planejadas"
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveRisk}>Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Export default para compatibilidade com importações dinâmicas
export default RiskManagement
