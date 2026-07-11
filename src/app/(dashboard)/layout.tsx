import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOpenUrgencyCount } from "@/lib/urgency-count";
import { logout } from "@/app/login/actions";
import { DashboardShell } from "@/components/dashboard-shell";

const ROLE_LABELS: Record<string, string> = {
  medico: "Médico",
  secretaria: "Secretária",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, urgencyCount] = await Promise.all([
    supabase.from("profiles").select("name, role").eq("id", user.id).single(),
    getOpenUrgencyCount(),
  ]);

  return (
    <DashboardShell
      urgencyCount={urgencyCount}
      profileName={profile?.name ?? user.email ?? "Conta"}
      roleLabel={profile?.role ? ROLE_LABELS[profile.role] ?? null : null}
      logoutAction={logout}
    >
      {children}
    </DashboardShell>
  );
}
