"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Shield,
  Heart,
  Building2,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { useCompany } from "@/contexts/company-context"

const getKpiDataByCompany = (companyId: string | undefined) => {
  const baseData = {
    "1": [
      { title: "Total de Funcionários", value: "1,247", icon: Users, trend: "+5.2%", trendUp: true },
      { title: "Exames em Dia", value: "1,156", icon: CheckCircle, trend: "+2.1%", trendUp: true },
      { title: "Não Conformidades Abertas", value: "23", icon: AlertTriangle, trend: "-12.3%", trendUp: false },
      { title: "Treinamentos Pendentes", value: "89", icon: Clock, trend: "+8.7%", trendUp: false },
    ],
    "2": [
      { title: "Total de Funcionários", value: "856", icon: Users, trend: "+3.1%", trendUp: true },
      { title: "Exames em Dia", value: "798", icon: CheckCircle, trend: "+1.8%", trendUp: true },
      { title: "Não Conformidades Abertas", value: "15", icon: AlertTriangle, trend: "-8.5%", trendUp: false },
      { title: "Treinamentos Pendentes", value: "42", icon: Clock, trend: "+12.3%", trendUp: false },
    ],
    "3": [
      { title: "Total de Funcionários", value: "432", icon: Users, trend: "+2.8%", trendUp: true },
      { title: "Exames em Dia", value: "401", icon: CheckCircle, trend: "+4.2%", trendUp: true },
      { title: "Não Conformidades Abertas", value: "8", icon: AlertTriangle, trend: "-15.7%", trendUp: false },
      { title: "Treinamentos Pendentes", value: "28", icon: Clock, trend: "+6.1%", trendUp: false },
    ],
  }
  return baseData[companyId as keyof typeof baseData] || baseData["1"]
}

const getRiskDataByCompany = (companyId: string | undefined) => {
  const baseData = {
    "1": [
      { name: "Jan", baixo: 45, medio: 23, alto: 8 },
      { name: "Fev", baixo: 52, medio: 19, alto: 6 },
      { name: "Mar", baixo: 48, medio: 25, alto: 12 },
      { name: "Apr", baixo: 61, medio: 22, alto: 9 },
      { name: "Mai", baixo: 55, medio: 28, alto: 7 },
      { name: "Jun", baixo: 67, medio: 20, alto: 5 },
    ],
    "2": [
      { name: "Jan", baixo: 32, medio: 18, alto: 5 },
      { name: "Fev", baixo: 38, medio: 15, alto: 4 },
      { name: "Mar", baixo: 35, medio: 20, alto: 8 },
      { name: "Apr", baixo: 42, medio: 16, alto: 6 },
      { name: "Mai", baixo: 39, medio: 22, alto: 5 },
      { name: "Jun", baixo: 45, medio: 14, alto: 3 },
    ],
    "3": [
      { name: "Jan", baixo: 18, medio: 12, alto: 3 },
      { name: "Fev", baixo: 22, medio: 10, alto: 2 },
      { name: "Mar", baixo: 20, medio: 14, alto: 4 },
      { name: "Apr", baixo: 25, medio: 11, alto: 3 },
      { name: "Mai", baixo: 23, medio: 16, alto: 2 },
      { name: "Jun", baixo: 28, medio: 9, alto: 1 },
    ],
  }
  return baseData[companyId as keyof typeof baseData] || baseData["1"]
}

const getExamDataByCompany = (companyId: string | undefined) => {
  const baseData = {
    "1": [
      { name: "Em Dia", value: 1156, color: "#22c55e" },
      { name: "Vencendo (30 dias)", value: 67, color: "#f59e0b" },
      { name: "Vencidos", value: 24, color: "#ef4444" },
    ],
    "2": [
      { name: "Em Dia", value: 798, color: "#22c55e" },
      { name: "Vencendo (30 dias)", value: 43, color: "#f59e0b" },
      { name: "Vencidos", value: 15, color: "#ef4444" },
    ],
    "3": [
      { name: "Em Dia", value: 401, color: "#22c55e" },
      { name: "Vencendo (30 dias)", value: 23, color: "#f59e0b" },
      { name: "Vencidos", value: 8, color: "#ef4444" },
    ],
  }
  return baseData[companyId as keyof typeof baseData] || baseData["1"]
}

export function Dashboard() {
  const { selectedCompany } = useCompany()

  const kpiData = getKpiDataByCompany(selectedCompany?.id)
  const riskData = getRiskDataByCompany(selectedCompany?.id)
  const examData = getExamDataByCompany(selectedCompany?.id)

  if (!selectedCompany) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard SST</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Visão geral do sistema de Segurança e Saúde no Trabalho
          </p>
        </div>

        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Selecione uma empresa na barra superior para visualizar os dados do dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard SST</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Visão geral do sistema de Segurança e Saúde no Trabalho - {selectedCompany.name}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="min-h-[120px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium leading-tight">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                  {kpi.trendUp ? (
                    <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 shrink-0" />
                  )}
                  <span className={kpi.trendUp ? "text-green-500" : "text-red-500"}>{kpi.trend}</span>
                  <span className="hidden sm:inline">vs mês anterior</span>
                  <span className="sm:hidden">vs mês ant.</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Gráfico de Riscos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Evolução dos Riscos</span>
            </CardTitle>
            <CardDescription className="text-sm">Classificação de riscos por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <BarChart data={riskData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    fontSize: "12px",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="baixo" stackId="a" fill="#22c55e" name="Baixo" />
                <Bar dataKey="medio" stackId="a" fill="#f59e0b" name="Médio" />
                <Bar dataKey="alto" stackId="a" fill="#ef4444" name="Alto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status dos Exames */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Status dos Exames Médicos</span>
            </CardTitle>
            <CardDescription className="text-sm">Situação atual dos ASOs</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <PieChart>
                <Pie
                  data={examData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  className="sm:inner-radius-[60px] sm:outer-radius-[120px]"
                >
                  {examData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: "12px",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 sm:mt-4 space-y-2">
              {examData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs sm:text-sm">{item.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Ações Pendentes */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Alertas Críticos</CardTitle>
            <CardDescription className="text-sm">Itens que requerem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-start sm:items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg gap-3">
              <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <p className="font-medium text-red-700 dark:text-red-300 text-sm sm:text-base">Exames Vencidos</p>
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">24 funcionários com ASO vencido</p>
                </div>
              </div>
              <Badge variant="destructive" className="text-xs shrink-0">
                Crítico
              </Badge>
            </div>

            <div className="flex items-start sm:items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg gap-3">
              <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <p className="font-medium text-yellow-700 dark:text-yellow-300 text-sm sm:text-base">
                    Treinamento NR-35
                  </p>
                  <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">89 funcionários pendentes</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                Atenção
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Próximas Ações</CardTitle>
            <CardDescription className="text-sm">Atividades programadas para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Auditoria Interna</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Setor Produção - Amanhã às 14h</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Treinamento NR-10</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Turma A - Sexta-feira às 8h</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base">Revisão PGR</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Análise anual - Próxima semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores de Conformidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Indicadores de Conformidade</CardTitle>
          <CardDescription className="text-sm">Status de conformidade com as principais NRs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>NR-07 (PCMSO)</span>
                <span className="font-medium">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>NR-09 (PGR)</span>
                <span className="font-medium">88%</span>
              </div>
              <Progress value={88} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>NR-06 (EPI)</span>
                <span className="font-medium">95%</span>
              </div>
              <Progress value={95} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
