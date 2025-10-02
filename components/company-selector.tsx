"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useCompany } from "@/contexts/company-context"
import { cn } from "@/lib/utils"

export function CompanySelector() {
  const { selectedCompany, companies, setSelectedCompany, isLoading } = useCompany()
  const [open, setOpen] = useState(false)

  const compactName = (name: string) => {
    if (!name) return ""
    const maxLen = 18
    if (name.length <= maxLen) return name
    const start = name.slice(0, 8)
    const end = name.slice(-6)
    return `${start}...${end}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="text-sm">Nenhuma empresa encontrada</span>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[480px] justify-center bg-transparent relative"
        >
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            {selectedCompany ? (
              <div className="flex items-center space-x-2">
                <span
                  className="cursor-pointer"
                  onClick={() => setOpen(true)}
                  title={selectedCompany.name}
                >
                  {compactName(selectedCompany.name)}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {selectedCompany.cnpj?.split("/")[0] || ''}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar empresa...</span>
            )}
          </div>
          <ChevronsUpDown className="absolute right-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." className="w-full" />
          <CommandList>
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              {companies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => {
                    setSelectedCompany(company.id === selectedCompany?.id ? null : company)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", selectedCompany?.id === company.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{company.name}</span>
                    <span className="text-xs text-muted-foreground">CNPJ: {company.cnpj}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
