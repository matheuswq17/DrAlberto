import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/supabase/session";
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
  const [{ user, profile }, urgencyCount] = await Promise.all([
    getSessionProfile(),
    getOpenUrgencyCount(),
  ]);
  if (!user) redirect("/login");

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
