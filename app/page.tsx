<<<<<<< HEAD
export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Sistema SST</h1>
      <p>Sistema funcionando corretamente!</p>
    </div>
  )
=======
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/dashboard-client"
import { DashboardServer } from "@/components/modules/dashboard-server"

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
      return <DashboardServer empresaId={empresa.id} empresaName={empresa.name} />
    }
  }

  return <DashboardClient user={data.user} />
>>>>>>> 7a9e6456e87b3c8c842d0ca75ffc6c3d68201554
}
