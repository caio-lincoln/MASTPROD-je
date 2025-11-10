"use client"

import { useState } from "react"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/contexts/company-context"

export function MobileCompanySelector() {
  const { selectedCompany, companies, setSelectedCompany, isLoading, user } = useCompany()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled>
        <div className="h-6 w-6 bg-muted animate-pulse rounded-full" />
      </Button>
    )
  }

  if (companies.length === 0) {
    if (!user) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          title="Faça login para ver empresas"
          onClick={() => (window.location.href = "/auth/login")}
        >
          <Building2 className="h-4 w-4" />
        </Button>
      )
    }
    return (
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled title="Nenhuma empresa encontrada">
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    )
  }

  const getCompanyInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 relative"
          title={selectedCompany ? `Empresa: ${selectedCompany.name}` : "Selecionar empresa"}
        >
          {selectedCompany ? (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {getCompanyInitials(selectedCompany.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Building2 className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Selecionar Empresa</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {companies.map((company) => (
            <Button
              key={company.id}
              variant={selectedCompany?.id === company.id ? "default" : "outline"}
              className="w-full justify-start h-auto p-4"
              onClick={() => {
                setSelectedCompany(company.id === selectedCompany?.id ? null : company)
                setOpen(false)
              }}
            >
              <div className="flex items-center space-x-3 w-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{getCompanyInitials(company.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium truncate w-full text-left">{company.name}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {company.cnpj.split("/")[0]}
                    </Badge>
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
