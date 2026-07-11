"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarLogo } from "@/components/sidebar-logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { SidebarProfile } from "@/components/sidebar-profile";

/** Drawer de navegação para tablet estreito e celular — fecha ao trocar de rota. */
export function MobileNav({
  urgencyCount,
  profileName,
  roleLabel,
  logoutAction,
}: {
  urgencyCount: number;
  profileName: string;
  roleLabel: string | null;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={<Button variant="ghost" size="icon" aria-label="Abrir menu de navegação" />}
      >
        <MenuIcon aria-hidden="true" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-foreground/25 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:transition-none" />
        <DialogPrimitive.Popup
          aria-label="Navegação"
          className="fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col gap-4 bg-sidebar p-4 shadow-xl outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left motion-reduce:transition-none"
        >
          <div className="flex items-center justify-between">
            <SidebarLogo />
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" aria-label="Fechar menu" />}
            >
              <XIcon aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav urgencyCount={urgencyCount} onNavigate={() => setOpen(false)} />
          </div>
          <SidebarProfile name={profileName} roleLabel={roleLabel} logoutAction={logoutAction} />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
