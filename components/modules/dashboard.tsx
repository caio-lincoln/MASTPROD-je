"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
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
import { useLoading } from "@/hooks/use-loading"
import { createBrowserClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface KPIData {
  title: string
  value: string
  icon: any
  trend: string
  trendUp: boolean
  variation: number
}

interface RiskData {
  name: string
  baixo: number
  medio: number
  alto: number
}

interface ExamData {
  name: string
  value: number
  color: string
}

interface DashboardStats {
  totalFuncionarios: number
  examesEmDia: number
  naoConformidadesAbertas: number
  treinamentosPendentes: number
  kpiVariations: {
    funcionarios: number
    exames: number
    naoConformidades: number
    treinamentos: number
  }
  examData: ExamData[]
  riskData: RiskData[]
  complianceData: {
    nr07: number
    nr09: number
    nr06: number
  }
}

export function Dashboard() {
  const { selectedCompany } = useCompany()
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const { isLoading, withLoading } = useLoading({ initialState: true })
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async (empresaId: string) => {
    await withLoading(async () => {
      try {
        setError(null)
        const supabase = createBrowserClient()

        const today = new Date()
        const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString()

        const { count: totalFuncionarios } = await supabase
          .from("funcionarios")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("ativo", true)

        const { count: lastMonthFuncionarios } = await supabase
          .from("funcionarios")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("ativo", true)
          .gte("data_admissao", startOfLastMonth)
          .lte("data_admissao", endOfLastMonth)

        const todayISO = new Date().toISOString()
        const { count: examesEmDia } = await supabase
          .from("exames_aso")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .gte("validade", todayISO)

        const { count: lastMonthExams } = await supabase
          .from("exames_aso")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .gte("validade", startOfLastMonth)
          .lte("validade", endOfLastMonth)

        const { count: naoConformidadesAbertas } = await supabase
          .from("nao_conformidades")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("status", "aberta")

        const { count: lastMonthNCs } = await supabase
          .from("nao_conformidades")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("status", "aberta")
          .gte("created_at", startOfLastMonth)
          .lte("created_at", endOfLastMonth)

        const { count: treinamentosPendentes } = await supabase
          .from("treinamento_funcionarios")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("status", "pendente")

        const { count: lastMonthPending } = await supabase
          .from("treinamento_funcionarios")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("status", "pendente")
          .gte("created_at", startOfLastMonth)
          .lte("created_at", endOfLastMonth)

        const calculateVariation = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0
          return ((current - previous) / previous) * 100
        }

        const kpiVariations = {
          funcionarios: calculateVariation(totalFuncionarios || 0, lastMonthFuncionarios || 0),
          exames: calculateVariation(examesEmDia || 0, lastMonthExams || 0),
          naoConformidades: calculateVariation(naoConformidadesAbertas || 0, lastMonthNCs || 0),
          treinamentos: calculateVariation(treinamentosPendentes || 0, lastMonthPending || 0),
        }

        const { data: examesData } = await supabase.from("exames_aso").select("*").eq("empresa_id", empresaId)

        const next30 = new Date()
        next30.setDate(today.getDate() + 30)

        const emDia = examesData?.filter((e) => new Date(e.validade) > next30) || []
        const vencendo =
          examesData?.filter((e) => new Date(e.validade) <= next30 && new Date(e.validade) >= today) || []
        const vencidos = examesData?.filter((e) => new Date(e.validade) < today) || []

        const { data: riscosData } = await supabase
          .from("gestao_riscos")
          .select("classificacao, data_identificacao")
          .eq("empresa_id", empresaId)
          .gte("data_identificacao", new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())

        const riskByMonth: { [key: string]: { baixo: number; medio: number; alto: number } } = {}
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]

        months.forEach((month) => {
          riskByMonth[month] = { baixo: 0, medio: 0, alto: 0 }
        })

        riscosData?.forEach((risco) => {
          const month = new Date(risco.data_identificacao).getMonth()
          const monthName = months[month]
          if (monthName && riskByMonth[monthName]) {
            if (risco.classificacao === "baixo") riskByMonth[monthName].baixo++
            else if (risco.classificacao === "medio") riskByMonth[monthName].medio++
            else if (risco.classificacao === "alto") riskByMonth[monthName].alto++
          }
        })

        const riskData: RiskData[] = months.map((month) => ({
          name: month,
          ...riskByMonth[month],
        }))

        const nr07 = totalFuncionarios ? Math.round((emDia.length / totalFuncionarios) * 100) : 0

        const { count: riscosComMitigacao } = await supabase
          .from("gestao_riscos")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .not("medidas_controle", "is", null)

        const { count: totalRiscos } = await supabase
          .from("gestao_riscos")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)

        const nr09 = totalRiscos ? Math.round(((riscosComMitigacao || 0) / totalRiscos) * 100) : 0

        const { count: funcionariosComEpi } = await supabase
          .from("entregas_epi")
          .select("funcionario_id", { count: "exact", head: true })
          .eq("empresa_id", empresaId)
          .eq("status", "ativo")

        const nr06 = totalFuncionarios ? Math.round(((funcionariosComEpi || 0) / totalFuncionarios) * 100) : 0

        setDashboardData({
          totalFuncionarios: totalFuncionarios || 0,
          examesEmDia: examesEmDia || 0,
          naoConformidadesAbertas: naoConformidadesAbertas || 0,
          treinamentosPendentes: treinamentosPendentes || 0,
          kpiVariations,
          examData: [
            { name: "Em Dia", value: emDia.length, color: "#22c55e" },
            { name: "Vencendo (30 dias)", value: vencendo.length, color: "#f59e0b" },
            { name: "Vencidos", value: vencidos.length, color: "#ef4444" },
          ],
          riskData,
          complianceData: {
            nr07,
            nr09,
            nr06,
          },
        })
      } catch (err) {
        setError("Erro ao carregar dados do dashboard")
      }
    })
  }

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchDashboardData(selectedCompany.id)
    }
  }, [selectedCompany?.id])

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

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard SST</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Carregando dados de {selectedCompany.name}...
          </p>
        </div>
        <LoadingSkeleton variant="dashboard" />
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard SST</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Visão geral do sistema de Segurança e Saúde no Trabalho - {selectedCompany.name}
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "Erro ao carregar dados do dashboard"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const kpiData: KPIData[] = [
    {
      title: "Total de Funcionários Ativos",
      value: dashboardData.totalFuncionarios.toString(),
      icon: Users,
      trend: `${dashboardData.kpiVariations.funcionarios >= 0 ? "+" : ""}${dashboardData.kpiVariations.funcionarios.toFixed(1)}%`,
      trendUp: dashboardData.kpiVariations.funcionarios >= 0,
      variation: dashboardData.kpiVariations.funcionarios,
    },
    {
      title: "Exames em Dia",
      value: dashboardData.examesEmDia.toString(),
      icon: CheckCircle,
      trend: `${dashboardData.kpiVariations.exames >= 0 ? "+" : ""}${dashboardData.kpiVariations.exames.toFixed(1)}%`,
      trendUp: dashboardData.kpiVariations.exames >= 0,
      variation: dashboardData.kpiVariations.exames,
    },
    {
      title: "Não Conformidades Abertas",
      value: dashboardData.naoConformidadesAbertas.toString(),
      icon: AlertTriangle,
      trend: `${dashboardData.kpiVariations.naoConformidades >= 0 ? "+" : ""}${dashboardData.kpiVariations.naoConformidades.toFixed(1)}%`,
      trendUp: dashboardData.kpiVariations.naoConformidades < 0,
      variation: dashboardData.kpiVariations.naoConformidades,
    },
    {
      title: "Treinamentos Pendentes",
      value: dashboardData.treinamentosPendentes.toString(),
      icon: Clock,
      trend: `${dashboardData.kpiVariations.treinamentos >= 0 ? "+" : ""}${dashboardData.kpiVariations.treinamentos.toFixed(1)}%`,
      trendUp: dashboardData.kpiVariations.treinamentos < 0,
      variation: dashboardData.kpiVariations.treinamentos,
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Dashboard SST</h1>
        <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1 line-clamp-2">
          Visão geral do sistema de Segurança e Saúde no Trabalho - {selectedCompany.name}
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          const getTrendColor = () => {
            if (kpi.title.includes("Não Conformidades") || kpi.title.includes("Pendentes")) {
              return kpi.variation < 0 ? "text-green-500" : "text-red-500"
            } else {
              return kpi.variation >= 0 ? "text-green-500" : "text-red-500"
            }
          }

          return (
            <Card key={index} className="min-h-[100px] sm:min-h-[120px]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium leading-tight line-clamp-2">{kpi.title}</CardTitle>
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                  {kpi.trendUp ? (
                    <TrendingUp className={`h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 ${getTrendColor()}`} />
                  ) : (
                    <TrendingDown className={`h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 ${getTrendColor()}`} />
                  )}
                  <span className={`text-xs ${getTrendColor()}`}>{kpi.trend}</span>
                  <span className="hidden sm:inline text-xs">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="flex items-center space-x-2 text-sm sm:text-base lg:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Evolução dos Riscos</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Classificação de riscos por mês</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] lg:h-[300px]">
              <BarChart data={dashboardData.riskData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} className="sm:text-xs" interval={0} />
                <YAxis tick={{ fontSize: 10 }} className="sm:text-xs" />
                <Tooltip
                  contentStyle={{
                    fontSize: "11px",
                    padding: "6px 8px",
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

        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="flex items-center space-x-2 text-sm sm:text-base lg:text-lg">
              <Heart className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>Status dos Exames Médicos</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Situação atual dos ASOs</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] lg:h-[300px]">
              <PieChart>
                <Pie
                  data={dashboardData.examData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  className="sm:inner-radius-[40px] sm:outer-radius-[80px] lg:inner-radius-[60px] lg:outer-radius-[120px]"
                >
                  {dashboardData.examData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: "11px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 sm:mt-3 lg:mt-4 space-y-1.5 sm:space-y-2">
              {dashboardData.examData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm truncate">{item.name}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium shrink-0 ml-2">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base lg:text-lg">Alertas Críticos</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Itens que requerem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 lg:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
            {(() => {
              const vencidosItem = dashboardData?.examData?.find((e) => e.name === "Vencidos");
              return vencidosItem && vencidosItem.value > 0;
            })() && (
              <div className="flex items-start justify-between p-2 sm:p-3 bg-red-50 dark:bg-red-950 rounded-lg gap-2 sm:gap-3">
                <div className="flex items-start space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-red-700 dark:text-red-300 text-xs sm:text-sm lg:text-base">
                      Exames Vencidos
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
                      {dashboardData?.examData?.find((e) => e.name === "Vencidos")?.value || 0} funcionários com ASO vencido
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs shrink-0">
                  Crítico
                </Badge>
              </div>
            )}

            {dashboardData?.treinamentosPendentes > 0 && (
              <div className="flex items-start justify-between p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg gap-2 sm:gap-3">
                <div className="flex items-start space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm lg:text-base">
                      Treinamentos Pendentes
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 line-clamp-2">
                      {dashboardData?.treinamentosPendentes} funcionários pendentes
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  Atenção
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base lg:text-lg">Próximas Ações</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Atividades programadas para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 lg:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full shrink-0 mt-1.5 sm:mt-2" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm lg:text-base">Auditoria Interna</p>
                <p className="text-xs text-muted-foreground truncate">Setor Produção - Amanhã às 14h</p>
              </div>
            </div>

            <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full shrink-0 mt-1.5 sm:mt-2" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm lg:text-base">Treinamento NR-10</p>
                <p className="text-xs text-muted-foreground truncate">Turma A - Sexta-feira às 8h</p>
              </div>
            </div>

            <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full shrink-0 mt-1.5 sm:mt-2" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm lg:text-base">Revisão PGR</p>
                <p className="text-xs text-muted-foreground truncate">Análise anual - Próxima semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-sm sm:text-base lg:text-lg">Indicadores de Conformidade</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Status de conformidade com as principais NRs</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>NR-07 (PCMSO)</span>
                <span className="font-medium">{dashboardData.complianceData.nr07}%</span>
              </div>
              <Progress value={dashboardData.complianceData.nr07} className="h-1.5 sm:h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>NR-09 (PGR)</span>
                <span className="font-medium">{dashboardData.complianceData.nr09}%</span>
              </div>
              <Progress value={dashboardData.complianceData.nr09} className="h-1.5 sm:h-2" />
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>NR-06 (EPI)</span>
                <span className="font-medium">{dashboardData.complianceData.nr06}%</span>
              </div>
              <Progress value={dashboardData.complianceData.nr06} className="h-1.5 sm:h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
