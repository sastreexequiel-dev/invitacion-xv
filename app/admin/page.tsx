import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase/server";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Segunda verificación del lado del servidor (además de proxy.ts y RLS)
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return <AdminDashboard email={user.email ?? ""} />;
}
