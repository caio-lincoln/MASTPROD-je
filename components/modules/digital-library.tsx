"use client"

import { useState } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  FileText,
  Plus,
  Upload,
  Download,
  Eye,
  Edit,
  Search,
  Filter,
  FolderOpen,
  File,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"

const documentDataByCompany = {
  "1": [
    {
      id: 1,
      nome: "PGR - Programa de Gerenciamento de Riscos 2024",
      categoria: "Programa",
      tipo: "PDF",
      tamanho: "2.5 MB",
      versao: "3.1",
      dataUpload: "2024-01-15",
      dataVencimento: "2025-01-15",
      status: "Ativo",
      responsavel: "João Santos",
      downloads: 45,
      visualizacoes: 128,
      companyId: "1",
    },
    {
      id: 2,
      nome: "PCMSO - Programa de Controle Médico 2024",
      categoria: "Programa",
      tipo: "PDF",
      tamanho: "1.8 MB",
      versao: "2.3",
      dataUpload: "2024-02-10",
      dataVencimento: "2025-02-10",
      status: "Ativo",
      responsavel: "Maria Silva",
      downloads: 32,
      visualizacoes: 89,
      companyId: "1",
    },
    {
      id: 3,
      nome: "NR-35 - Trabalho em Altura",
      categoria: "Norma Regulamentadora",
      tipo: "PDF",
      tamanho: "850 KB",
      versao: "1.0",
      dataUpload: "2024-03-05",
      dataVencimento: "2025-12-31",
      status: "Ativo",
      responsavel: "Carlos Lima",
      downloads: 67,
      visualizacoes: 156,
      companyId: "1",
    },
  ],
  "2": [
    {
      id: 4,
      nome: "Procedimento de Emergência - Incêndio",
      categoria: "Procedimento",
      tipo: "DOCX",
      tamanho: "1.2 MB",
      versao: "2.0",
      dataUpload: "2024-01-20",
      dataVencimento: "2024-12-20",
      status: "Vencendo",
      responsavel: "Ana Costa",
      downloads: 23,
      visualizacoes: 78,
      companyId: "2",
    },
    {
      id: 5,
      nome: "Manual de EPI - Equipamentos de Proteção",
      categoria: "Manual",
      tipo: "PDF",
      tamanho: "3.2 MB",
      versao: "1.5",
      dataUpload: "2023-11-15",
      dataVencimento: "2024-11-15",
      status: "Vencido",
      responsavel: "Pedro Oliveira",
      downloads: 89,
      visualizacoes: 234,
      companyId: "2",
    },
    {
      id: 6,
      nome: "NR-33 - Espaços Confinados",
      categoria: "Norma Regulamentadora",
      tipo: "PDF",
      tamanho: "1.1 MB",
      versao: "2.1",
      dataUpload: "2024-04-12",
      dataVencimento: "2025-04-12",
      status: "Ativo",
      responsavel: "Roberto Costa",
      downloads: 34,
      visualizacoes: 92,
      companyId: "2",
    },
  ],
  "3": [
    {
      id: 7,
      nome: "NR-12 - Segurança em Máquinas",
      categoria: "Norma Regulamentadora",
      tipo: "PDF",
      tamanho: "2.1 MB",
      versao: "1.8",
      dataUpload: "2024-05-08",
      dataVencimento: "2025-05-08",
      status: "Ativo",
      responsavel: "Ana Ferreira",
      downloads: 28,
      visualizacoes: 76,
      companyId: "3",
    },
    {
      id: 8,
      nome: "Manual de Operação - Prensas",
      categoria: "Manual",
      tipo: "PDF",
      tamanho: "4.2 MB",
      versao: "3.0",
      dataUpload: "2024-03-22",
      dataVencimento: "2025-03-22",
      status: "Ativo",
      responsavel: "Carlos Machado",
      downloads: 41,
      visualizacoes: 118,
      companyId: "3",
    },
  ],
}

const getCategoryDataForCompany = (documents: any[]) => {
  const categories = [
    { nome: "Programas", icone: FolderOpen },
    { nome: "Normas Regulamentadoras", icone: FileText },
    { nome: "Procedimentos", icone: File },
    { nome: "Manuais", icone: FileText },
    { nome: "Formulários", icone: File },
    { nome: "Certificados", icone: FileText },
  ]

  return categories.map((category) => ({
    ...category,
    quantidade: documents.filter((doc) => {
      switch (category.nome) {
        case "Programas":
          return doc.categoria === "Programa"
        case "Normas Regulamentadoras":
          return doc.categoria === "Norma Regulamentadora"
        case "Procedimentos":
          return doc.categoria === "Procedimento"
        case "Manuais":
          return doc.categoria === "Manual"
        case "Formulários":
          return doc.categoria === "Formulário"
        case "Certificados":
          return doc.categoria === "Certificado"
        default:
          return false
      }
    }).length,
  }))
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ativo":
      return "default"
    case "Vencendo":
      return "secondary"
    case "Vencido":
      return "destructive"
    case "Arquivado":
      return "outline"
    default:
      return "secondary"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Ativo":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "Vencendo":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "Vencido":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "Arquivado":
      return <Archive className="h-4 w-4 text-muted-foreground" />
    default:
      return <File className="h-4 w-4" />
  }
}

const getFileIcon = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case "pdf":
      return "📄"
    case "docx":
    case "doc":
      return "📝"
    case "xlsx":
    case "xls":
      return "📊"
    case "pptx":
    case "ppt":
      return "📋"
    default:
      return "📁"
  }
}

export function DigitalLibrary() {
  const { selectedCompany } = useCompany()
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const documentData = selectedCompany ? documentDataByCompany[selectedCompany.id] || [] : []
  const categoryData = getCategoryDataForCompany(documentData)

  const filteredDocuments = documentData.filter(
    (doc) =>
      doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.categoria.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const stats = {
    totalDocuments: documentData.length,
    totalDownloads: documentData.reduce((acc, doc) => acc + doc.downloads, 0),
    totalViews: documentData.reduce((acc, doc) => acc + doc.visualizacoes, 0),
    activeDocuments: documentData.filter((doc) => doc.status === "Ativo").length,
    expiringSoon: documentData.filter((doc) => doc.status === "Vencendo").length,
    expired: documentData.filter((doc) => doc.status === "Vencido").length,
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <FileText className="h-8 w-8" />
              <span>Biblioteca Digital</span>
            </h1>
            <p className="text-muted-foreground">Gestão de documentos com versionamento e controle de validade</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
                <p className="text-muted-foreground">
                  Selecione uma empresa no menu superior para visualizar a biblioteca de documentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <FileText className="h-8 w-8" />
            <span>Biblioteca Digital</span>
          </h1>
          <p className="text-muted-foreground">
            Gestão de documentos com versionamento e controle de validade - {selectedCompany.name}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Documento</DialogTitle>
              <DialogDescription>
                Faça upload de um novo documento para a biblioteca de {selectedCompany.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Arquivo</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Arraste e solte o arquivo aqui ou clique para selecionar
                  </p>
                  <Button variant="outline" size="sm">
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Documento</Label>
                  <Input placeholder="Ex: PGR 2024" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programa">Programa</SelectItem>
                      <SelectItem value="nr">Norma Regulamentadora</SelectItem>
                      <SelectItem value="procedimento">Procedimento</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="formulario">Formulário</SelectItem>
                      <SelectItem value="certificado">Certificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Versão</Label>
                  <Input placeholder="Ex: 1.0" />
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input type="date" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joao">João Santos</SelectItem>
                    <SelectItem value="maria">Maria Silva</SelectItem>
                    <SelectItem value="carlos">Carlos Lima</SelectItem>
                    <SelectItem value="ana">Ana Costa</SelectItem>
                    <SelectItem value="roberto">Roberto Costa</SelectItem>
                    <SelectItem value="anaferreira">Ana Ferreira</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea placeholder="Descreva o conteúdo do documento" />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Input placeholder="Ex: segurança, procedimento, emergência (separadas por vírgula)" />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Fazer Upload</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="documentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="vencimentos">Vencimentos</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar documentos..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="programa">Programas</SelectItem>
                    <SelectItem value="nr">Normas</SelectItem>
                    <SelectItem value="procedimento">Procedimentos</SelectItem>
                    <SelectItem value="manual">Manuais</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="vencendo">Vencendo</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Biblioteca de Documentos</CardTitle>
              <CardDescription>
                Todos os documentos de {selectedCompany.name} organizados com controle de versão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentData.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum documento encontrado</h3>
                  <p className="text-muted-foreground">Não há documentos cadastrados para {selectedCompany.name}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Upload</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{getFileIcon(doc.tipo)}</span>
                            <div>
                              <p className="font-medium">{doc.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {doc.tipo} • {doc.tamanho}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doc.categoria}</TableCell>
                        <TableCell>
                          <Badge variant="outline">v{doc.versao}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(doc.dataUpload), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{format(new Date(doc.dataVencimento), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(doc.status)}
                            <Badge variant={getStatusColor(doc.status) as any}>{doc.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{doc.responsavel}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedDocument(doc)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="categorias" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {categoryData.map((category, index) => {
              const Icon = category.icone
              return (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg">{category.nome}</CardTitle>
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{category.quantidade}</div>
                    <p className="text-sm text-muted-foreground">documentos</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
              <CardDescription>Visualização da organização dos documentos de {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category, index) => {
                  const totalDocs = categoryData.reduce((acc, cat) => acc + cat.quantidade, 0)
                  return (
                    <div key={index} className="flex justify-between items-center">
                      <span>{category.nome}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${totalDocs > 0 ? (category.quantidade / totalDocs) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{category.quantidade}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vencimentos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documentos Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeDocuments}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalDocuments > 0 ? Math.round((stats.activeDocuments / stats.totalDocuments) * 100) : 0}% do
                  total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencendo (30 dias)</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalDocuments > 0 ? Math.round((stats.expiringSoon / stats.totalDocuments) * 100) : 0}% do
                  total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalDocuments > 0 ? Math.round((stats.expired / stats.totalDocuments) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Documentos Vencidos</span>
                </CardTitle>
                <CardDescription>Documentos que precisam ser atualizados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {documentData.filter((doc) => doc.status === "Vencido").length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum documento vencido</p>
                  </div>
                ) : (
                  documentData
                    .filter((doc) => doc.status === "Vencido")
                    .map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{doc.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              Vencido em {format(new Date(doc.dataVencimento), "dd/MM/yyyy")}
                            </p>
                          </div>
                          <Badge variant="destructive">Vencido</Badge>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span>Vencendo em Breve</span>
                </CardTitle>
                <CardDescription>Documentos que vencem nos próximos 30 dias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {documentData.filter((doc) => doc.status === "Vencendo").length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum documento vencendo</p>
                  </div>
                ) : (
                  documentData
                    .filter((doc) => doc.status === "Vencendo")
                    .map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{doc.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              Vence em {format(new Date(doc.dataVencimento), "dd/MM/yyyy")}
                            </p>
                          </div>
                          <Badge variant="secondary">Vencendo</Badge>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estatisticas" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                <p className="text-xs text-muted-foreground">Biblioteca completa</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Downloads</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDownloads}</div>
                <p className="text-xs text-muted-foreground">Total de downloads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalViews}</div>
                <p className="text-xs text-muted-foreground">Total de visualizações</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Espaço Utilizado</CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    documentData.reduce((acc, doc) => {
                      const size = Number.parseFloat(doc.tamanho.replace(/[^\d.]/g, ""))
                      return acc + (doc.tamanho.includes("GB") ? size * 1024 : size)
                    }, 0) / 1024
                  ).toFixed(1)}{" "}
                  GB
                </div>
                <p className="text-xs text-muted-foreground">de 10 GB disponível</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Documentos Mais Acessados</CardTitle>
              <CardDescription>Top documentos por número de visualizações em {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documentData.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum documento disponível</p>
                  </div>
                ) : (
                  documentData
                    .sort((a, b) => b.visualizacoes - a.visualizacoes)
                    .slice(0, 5)
                    .map((doc, index) => (
                      <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{doc.nome}</p>
                            <p className="text-sm text-muted-foreground">{doc.categoria}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{doc.visualizacoes}</p>
                          <p className="text-sm text-muted-foreground">visualizações</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedDocument && (
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedDocument.nome}</DialogTitle>
              <DialogDescription>Detalhes completos do documento</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Arquivo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{selectedDocument.tipo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamanho:</span>
                      <span>{selectedDocument.tamanho}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Versão:</span>
                      <Badge variant="outline">v{selectedDocument.versao}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data de Upload:</span>
                      <span>{format(new Date(selectedDocument.dataUpload), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vencimento:</span>
                      <span>{format(new Date(selectedDocument.dataVencimento), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedDocument.status) as any}>{selectedDocument.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estatísticas de Uso</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responsável:</span>
                      <span>{selectedDocument.responsavel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Downloads:</span>
                      <span className="font-medium">{selectedDocument.downloads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Visualizações:</span>
                      <span className="font-medium">{selectedDocument.visualizacoes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria:</span>
                      <span>{selectedDocument.categoria}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export { DigitalLibrary as DigitalLibraryComponent }
export default DigitalLibrary
