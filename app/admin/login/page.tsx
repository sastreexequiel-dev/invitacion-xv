import LoginForm from "@/components/admin/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm configured={isSupabaseConfigured} notAdmin={error === "no-admin"} />;
}
