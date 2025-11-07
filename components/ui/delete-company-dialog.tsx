"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Building2 } from "lucide-react"
import { type Company } from "@/contexts/company-context"

interface DeleteCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteCompanyDialog({
  open,
  onOpenChange,
  company,
  onConfirm,
  isDeleting = false
}: DeleteCompanyDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState("")

  const handleClose = () => {
    setStep(1)
    setConfirmText("")
    onOpenChange(false)
  }

  const handleFirstConfirm = () => {
    setStep(2)
  }

  const handleFinalConfirm = () => {
    if (confirmText === "DELETAR") {
      onConfirm()
      handleClose()
    }
  }

  const isConfirmTextValid = confirmText === "DELETAR"

  if (!company) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-red-900 dark:text-red-100">
                {step === 1 ? "Confirmar Exclusão" : "Confirmação Final"}
              </DialogTitle>
              <DialogDescription className="text-red-700 dark:text-red-300">
                Esta ação não pode ser desfeita
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
              <Building2 className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">
                  {company.name}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  CNPJ: {company.cnpj || "Não informado"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                ⚠️ ATENÇÃO: Deletar esta empresa irá remover PERMANENTEMENTE:
              </p>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 ml-4">
                <li>• Todos os funcionários</li>
                <li>• Todos os relatórios gerados</li>
                <li>• Todos os treinamentos</li>
                <li>• Todos os exames médicos</li>
                <li>• Todas as não conformidades</li>
                <li>• Todos os dados de segurança</li>
                <li>• Todas as configurações</li>
                <li>• Todos os logs e auditoria</li>
              </ul>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mt-3">
                Esta ação NÃO PODE ser desfeita!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                Para confirmar a exclusão da empresa <strong>{company.name}</strong>, 
                digite <strong>DELETAR</strong> no campo abaixo:
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm-text" className="text-red-700 dark:text-red-300">
                  Digite "DELETAR" para confirmar:
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETAR"
                  className="border-red-300 focus:border-red-500 focus:ring-red-500"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          {step === 1 ? (
            <Button
              variant="destructive"
              onClick={handleFirstConfirm}
              disabled={isDeleting}
            >
              Continuar
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleFinalConfirm}
              disabled={!isConfirmTextValid || isDeleting}
            >
              {isDeleting ? "Deletando..." : "Deletar Empresa"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
