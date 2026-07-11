import { MobileNav } from "@/components/mobile-nav";
import { SidebarLogo } from "@/components/sidebar-logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { SidebarProfile } from "@/components/sidebar-profile";
import { Toaster } from "@/components/ui/toast";

/**
 * Casca do dashboard: sidebar fixa (rail compacto no tablet, completa no
 * desktop) + barra superior mínima só no mobile, com drawer acessível.
 */
export function DashboardShell({
  urgencyCount,
  profileName,
  roleLabel,
  logoutAction,
  children,
}: {
  urgencyCount: number;
  profileName: string;
  roleLabel: string | null;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex md:w-[76px] lg:w-64 lg:px-4">
        <div className="lg:hidden">
          <SidebarLogo compact />
        </div>
        <div className="hidden lg:block">
          <SidebarLogo />
        </div>
        <div className="flex-1 overflow-y-auto lg:hidden">
          <SidebarNav urgencyCount={urgencyCount} compact />
        </div>
        <div className="hidden flex-1 overflow-y-auto lg:block">
          <SidebarNav urgencyCount={urgencyCount} />
        </div>
        <div className="lg:hidden">
          <SidebarProfile
            name={profileName}
            roleLabel={roleLabel}
            logoutAction={logoutAction}
            compact
          />
        </div>
        <div className="hidden lg:block">
          <SidebarProfile
            name={profileName}
            roleLabel={roleLabel}
            logoutAction={logoutAction}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <MobileNav
            urgencyCount={urgencyCount}
            profileName={profileName}
            roleLabel={roleLabel}
            logoutAction={logoutAction}
          />
          <SidebarLogo />
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
