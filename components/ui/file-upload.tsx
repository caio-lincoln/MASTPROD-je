"use client"

import { useState, useRef, type DragEvent, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, File, ImageIcon, FileText } from "lucide-react"
import { uploadArquivo, validarTipoArquivo, validarTamanhoArquivo, type FileType } from "@/lib/supabase/storage"

interface FileUploadProps {
  type: FileType
  onUploadComplete?: (url: string, path: string) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  maxSizeMB?: number
  accept?: string
  className?: string
  empresaId?: string
}

interface UploadingFile {
  file: File
  progress: number
  url?: string
  error?: string
}

export function FileUpload({
  type,
  onUploadComplete,
  onUploadError,
  maxFiles = 1,
  maxSizeMB = 10,
  accept,
  className = "",
  empresaId,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files).slice(0, maxFiles)

    // Validar arquivos
    const validFiles = fileArray.filter((file) => {
      if (!validarTipoArquivo(file, type)) {
        onUploadError?.(`Tipo de arquivo não permitido: ${file.name}`)
        return false
      }

      if (!validarTamanhoArquivo(file, type)) {
        onUploadError?.(`Arquivo muito grande: ${file.name}`)
        return false
      }

      return true
    })

    if (validFiles.length === 0) return

    // Inicializar estado de upload
    const initialFiles = validFiles.map((file) => ({
      file,
      progress: 0,
    }))

    setUploadingFiles(initialFiles)

    // Fazer upload de cada arquivo
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      try {
        // Simular progresso (em uma implementação real, você usaria um callback de progresso)
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f, index) => (index === i ? { ...f, progress: Math.min(f.progress + 10, 90) } : f)),
          )
        }, 100)

        const result = await uploadArquivo(file, type, undefined, empresaId)

        clearInterval(progressInterval)

        if (result && !result.error) {
          setUploadingFiles((prev) =>
            prev.map((f, index) => (index === i ? { ...f, progress: 100, url: result.publicUrl } : f)),
          )

          onUploadComplete?.(result.publicUrl, result.path)
        } else {
          setUploadingFiles((prev) =>
            prev.map((f, index) => (index === i ? { ...f, error: result?.error || "Erro no upload" } : f)),
          )

          onUploadError?.(result?.error || "Erro no upload")
        }
      } catch (error) {
        setUploadingFiles((prev) => prev.map((f, index) => (index === i ? { ...f, error: "Erro no upload" } : f)))

        onUploadError?.("Erro no upload")
      }
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (file.type === "application/pdf") return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de Drop */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Clique para selecionar ou arraste arquivos aqui</p>
          <p className="text-xs text-muted-foreground">
            Máximo {maxFiles} arquivo(s), até {maxSizeMB}MB cada
          </p>
        </CardContent>
      </Card>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Lista de arquivos sendo enviados */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                {getFileIcon(uploadingFile.file)}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>

                  {uploadingFile.error ? (
                    <p className="text-xs text-destructive">{uploadingFile.error}</p>
                  ) : uploadingFile.url ? (
                    <p className="text-xs text-green-600">Upload concluído</p>
                  ) : (
                    <div className="space-y-1">
                      <Progress value={uploadingFile.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground">{uploadingFile.progress}%</p>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
