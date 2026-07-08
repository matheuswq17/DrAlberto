"use client";

// Ícone "(?)" com explicação em popover — abre no hover (mouse) e no
// clique/toque (celular). Serve para tirar jargão técnico do texto corrido
// sem esconder a informação.

import { Popover } from "@base-ui/react/popover";

export function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={100}
        aria-label="Mais informações"
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        ?
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className="z-50 max-w-64 rounded-md border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-md outline-none">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
