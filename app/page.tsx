import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard-client"
import { DashboardServer } from "@/components/modules/dashboard-client-new"
import { ModulePreloader } from "@/components/module-preloader"

interface PageProps {
  searchParams: Promise<{ empresa?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const params = await searchParams

  if (params.empresa) {
    const { data: empresa } = await supabase.from("empresas").select("id, name").eq("id", params.empresa).single()

    if (empresa) {
      return (
        <>
          <DashboardServer empresaId={empresa.id} empresaName={empresa.name} />
          <ModulePreloader />
        </>
      )
    }
  }

  return (
    <>
      <DashboardClient user={data.user} />
      <ModulePreloader />
    </>
  )
}
