"use client"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  MoreHorizontal,
} from "lucide-react"
import { format } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { uploadDocumentoBiblioteca, validarTipoArquivo, validarTamanhoArquivo } from "@/lib/supabase/storage"

interface Document {
  id: string
  titulo: string
  categoria: string
  tipo: string
  tamanho: string
  versao: string
  validade?: string
  arquivo_url?: string
  responsavel: string
  downloads: number
  visualizacoes: number
  status: "Ativo" | "Vencendo" | "Vencido"
  criado_em: string
}

export default function DigitalLibraryComponent() {
  const { selectedCompany } = useCompany()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [isNewDocumentDialogOpen, setIsNewDocumentDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [editFormData, setEditFormData] = useState({
    titulo: "",
    categoria: "",
    versao: "",
    validade: "",
    responsavel: "",
  })
  const [newDocFile, setNewDocFile] = useState<File | null>(null)
  const [newDocCategoria, setNewDocCategoria] = useState("")

  const supabase = createClientComponentClient()

  const loadDocuments = async () => {
    if (!selectedCompany) {
      setDocuments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("criado_em", { ascending: false })

      if (error) {
        console.error("Erro ao carregar documentos:", error)
        return
      }

      setDocuments(data || [])
    } catch (error) {
      console.error("Erro ao carregar documentos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [selectedCompany])

  const handleSaveNewDocument = async (formData: any) => {
    if (!selectedCompany) return
    if (!newDocFile) {
      console.error("Selecione um arquivo para upload.")
      return
    }

    // Validações de arquivo
    if (!validarTipoArquivo(newDocFile, "biblioteca")) {
      console.error("Tipo de arquivo não permitido para Biblioteca.")
      return
    }
    if (!validarTamanhoArquivo(newDocFile, "biblioteca")) {
      console.error("Arquivo excede o tamanho máximo permitido.")
      return
    }

    // Derivar tipo e tamanho do arquivo
    const ext = (newDocFile.name.split(".").pop() || "").toLowerCase()
    const tipoDerivado =
      ext === "pdf"
        ? "PDF"
        : ext === "docx" || ext === "doc"
          ? ext.toUpperCase()
          : ext === "txt"
            ? "TXT"
            : ext.toUpperCase()
    const tamanhoFormatado = (() => {
      const size = newDocFile.size
      const kb = size / 1024
      const mb = kb / 1024
      if (mb >= 1) return `${mb.toFixed(2)} MB`
      return `${Math.ceil(kb)} KB`
    })()

    // Upload para Storage (bucket biblioteca)
    const uploadResult = await uploadDocumentoBiblioteca(newDocFile, selectedCompany.id)
    if (!uploadResult || uploadResult.error) {
      console.error("Erro no upload do arquivo:", uploadResult?.error)
      return
    }

    try {
      const { data, error } = await supabase
        .from("documentos")
        .insert([
          {
            empresa_id: selectedCompany.id,
            titulo: formData.titulo,
            categoria: newDocCategoria || (formData.categoria as string) || "",
            tipo: tipoDerivado || (formData.tipo as string) || "PDF",
            tamanho: tamanhoFormatado || (formData.tamanho as string) || "0 KB",
            versao: formData.versao,
            validade: formData.validade || null,
            responsavel: formData.responsavel,
            downloads: 0,
            visualizacoes: 0,
            status: "Ativo",
            arquivo_url: uploadResult.publicUrl,
          },
        ])
        .select()

      if (error) {
        console.error("Erro ao salvar documento:", error)
        return
      }

      await loadDocuments()
      setIsNewDocumentDialogOpen(false)
      setNewDocFile(null)
      setNewDocCategoria("")
    } catch (error) {
      console.error("Erro ao salvar documento:", error)
    }
  }

  const handleSaveChanges = async () => {
    if (!editingDocument || !selectedCompany) return

    try {
      const { error } = await supabase
        .from("documentos")
        .update({
          titulo: editFormData.titulo,
          categoria: editFormData.categoria,
          versao: editFormData.versao,
          validade: editFormData.validade || null,
          responsavel: editFormData.responsavel,
        })
        .eq("id", editingDocument.id)
        .eq("empresa_id", selectedCompany.id)

      if (error) {
        console.error("Erro ao atualizar documento:", error)
        return
      }

      await loadDocuments()
      setIsEditDialogOpen(false)
      setEditingDocument(null)
    } catch (error) {
      console.error("Erro ao atualizar documento:", error)
    }
  }

  const handleViewDocument = async (document: Document) => {
    try {
      await supabase
        .from("documentos")
        .update({ visualizacoes: document.visualizacoes + 1 })
        .eq("id", document.id)

      setSelectedDocument(document)
      setIsDetailsDialogOpen(true)
      await loadDocuments()
    } catch (error) {
      console.error("Erro ao incrementar visualizações:", error)
    }
  }

  const handleDownloadDocument = async (document: any) => {
    try {
      // Aqui você implementaria o download real do arquivo
      await loadDocuments()
    } catch (error) {
      console.error("Erro ao incrementar downloads:", error)
    }
  }

  const categories = Array.from(new Set(documents.map((d) => d.categoria).filter(Boolean)))
  const getCategoryDataForCompany = (docs: Document[]) => {
    return categories.map((nome) => ({
      nome,
      icone: FolderOpen,
      quantidade: docs.filter((doc) => doc.categoria === nome).length,
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

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "Todos" || doc.categoria === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categoryData = getCategoryDataForCompany(documents)

  const stats = {
    totalDocuments: documents.length,
    totalDownloads: documents.reduce((acc, doc) => acc + doc.downloads, 0),
    totalViews: documents.reduce((acc, doc) => acc + doc.visualizacoes, 0),
    activeDocuments: documents.filter((doc) => doc.status === "Ativo").length,
    expiringSoon: documents.filter((doc) => doc.status === "Vencendo").length,
    expired: documents.filter((doc) => doc.status === "Vencido").length,
  }

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false)
    setEditingDocument(null)
    setEditFormData({
      titulo: "",
      categoria: "",
      versao: "",
      validade: "",
      responsavel: "",
    })
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma empresa selecionada</h3>
          <p className="text-muted-foreground">Selecione uma empresa para visualizar a biblioteca digital.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando documentos...</p>
        </div>
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
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Documentos</CardTitle>
                <Button onClick={() => setIsNewDocumentDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Documento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{doc.titulo}</div>
                            <div className="text-sm text-muted-foreground">
                              {doc.tipo} • {doc.tamanho}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doc.categoria}</TableCell>
                        <TableCell>{doc.versao}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              doc.status === "Ativo"
                                ? "default"
                                : doc.status === "Vencendo"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{doc.responsavel}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDocument(doc)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadDocument(doc)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingDocument(doc)
                                  setEditFormData({
                                    titulo: doc.titulo,
                                    categoria: doc.categoria,
                                    versao: doc.versao,
                                    validade: doc.validade || "",
                                    responsavel: doc.responsavel,
                                  })
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
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
                {documents.filter((doc) => doc.status === "Vencido").length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum documento vencido</p>
                  </div>
                ) : (
                  documents
                    .filter((doc) => doc.status === "Vencido")
                    .map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{doc.titulo}</p>
                            <p className="text-sm text-muted-foreground">
                              Vencido em{" "}
                              {doc.validade ? format(new Date(doc.validade), "dd/MM/yyyy") : "Data não definida"}
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
                {documents.filter((doc) => doc.status === "Vencendo").length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum documento vencendo</p>
                  </div>
                ) : (
                  documents
                    .filter((doc) => doc.status === "Vencendo")
                    .map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{doc.titulo}</p>
                            <p className="text-sm text-muted-foreground">
                              Vence em{" "}
                              {doc.validade ? format(new Date(doc.validade), "dd/MM/yyyy") : "Data não definida"}
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
                    documents.reduce((acc, doc) => {
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
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum documento disponível</p>
                  </div>
                ) : (
                  documents
                    .sort((a, b) => b.visualizacoes - a.visualizacoes)
                    .slice(0, 5)
                    .map((doc, index) => (
                      <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{doc.titulo}</p>
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

      {/* New Document Dialog */}
      <Dialog open={isNewDocumentDialogOpen} onOpenChange={setIsNewDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
            <DialogDescription>Adicione um novo documento à biblioteca digital.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleSaveNewDocument({
                titulo: formData.get("titulo"),
                categoria: formData.get("categoria"),
                tipo: formData.get("tipo"),
                tamanho: formData.get("tamanho"),
                versao: formData.get("versao"),
                validade: formData.get("validade"),
                responsavel: formData.get("responsavel"),
              })
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="titulo" className="text-right">
                  Título
                </Label>
                <Input id="titulo" name="titulo" className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoria" className="text-right">
                  Categoria
                </Label>
                <div className="col-span-3">
                  <Input
                    id="categoria"
                    name="categoria"
                    placeholder="Digite ou selecione uma categoria"
                    list="lista-categorias"
                    value={newDocCategoria}
                    onChange={(e) => setNewDocCategoria(e.target.value)}
                    required
                  />
                  <datalist id="lista-categorias">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="versao" className="text-right">
                  Versão
                </Label>
                <Input id="versao" name="versao" className="col-span-3" placeholder="Ex: 1.0, 2.3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="validade" className="text-right">
                  Validade
                </Label>
                <Input id="validade" name="validade" type="date" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="responsavel" className="text-right">
                  Responsável
                </Label>
                <Input id="responsavel" name="responsavel" className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="arquivo" className="text-right">
                  Arquivo
                </Label>
                <Input
                  id="arquivo"
                  name="arquivo"
                  className="col-span-3"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] || null
                    setNewDocFile(file)
                  }}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewDocumentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>Edite as informações do documento selecionado.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveChanges()
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="titulo" className="text-right">
                  Título
                </Label>
                <Input
                  id="titulo"
                  name="titulo"
                  className="col-span-3"
                  value={editFormData.titulo}
                  onChange={(e) => setEditFormData({ ...editFormData, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoria" className="text-right">
                  Categoria
                </Label>
                <div className="col-span-3">
                  <Input
                    id="categoria-edit"
                    name="categoria"
                    placeholder="Digite ou selecione uma categoria"
                    list="lista-categorias-edit"
                    value={editFormData.categoria}
                    onChange={(e) => setEditFormData({ ...editFormData, categoria: e.target.value })}
                    required
                  />
                  <datalist id="lista-categorias-edit">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="versao" className="text-right">
                  Versão
                </Label>
                <Input
                  id="versao"
                  name="versao"
                  className="col-span-3"
                  placeholder="Ex: 1.0, 2.3"
                  value={editFormData.versao}
                  onChange={(e) => setEditFormData({ ...editFormData, versao: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="validade" className="text-right">
                  Validade
                </Label>
                <Input
                  id="validade"
                  name="validade"
                  type="date"
                  className="col-span-3"
                  value={editFormData.validade}
                  onChange={(e) => setEditFormData({ ...editFormData, validade: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="responsavel" className="text-right">
                  Responsável
                </Label>
                <Input
                  id="responsavel"
                  name="responsavel"
                  className="col-span-3"
                  value={editFormData.responsavel}
                  onChange={(e) => setEditFormData({ ...editFormData, responsavel: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Document Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={() => setIsDetailsDialogOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.titulo}</DialogTitle>
            <DialogDescription>Detalhes do documento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Input type="text" value={selectedDocument?.categoria} readOnly />
              </div>
              <div>
                <Label>Versão</Label>
                <Input type="text" value={selectedDocument?.versao} readOnly />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Responsável</Label>
                <Input type="text" value={selectedDocument?.responsavel} readOnly />
              </div>
              <div>
                <Label>Validade</Label>
                <Input
                  type="text"
                  value={
                    selectedDocument?.validade
                      ? format(new Date(selectedDocument?.validade), "dd/MM/yyyy")
                      : "Não definida"
                  }
                  readOnly
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Downloads</Label>
                <Input type="text" value={selectedDocument?.downloads} readOnly />
              </div>
              <div>
                <Label>Visualizações</Label>
                <Input type="text" value={selectedDocument?.visualizacoes} readOnly />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Fechar
            </Button>
            <Button type="button" onClick={() => handleDownloadDocument(selectedDocument!)}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { DigitalLibraryComponent as DigitalLibrary }
