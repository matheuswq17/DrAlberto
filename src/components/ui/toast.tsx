"use client"

import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Instância global — server actions chamam toastManager.add(...) fora de componentes. */
export const toastManager = ToastPrimitive.createToastManager()

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "relative w-full rounded-lg border bg-card p-3 pr-8 text-sm text-card-foreground shadow-md ring-1 ring-foreground/10 transition-all data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0",
        "data-[type=error]:border-destructive/40 data-[type=error]:bg-destructive/10 data-[type=error]:text-destructive"
      )}
    >
      <ToastPrimitive.Title className="font-medium">
        {toast.title}
      </ToastPrimitive.Title>
      {toast.description && (
        <ToastPrimitive.Description className="mt-0.5 text-muted-foreground">
          {toast.description}
        </ToastPrimitive.Description>
      )}
      <ToastPrimitive.Close
        className="absolute top-2 right-2 rounded-md p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
        aria-label="Fechar"
      >
        <XIcon className="size-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))
}

function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 outline-none sm:inset-x-auto sm:right-4">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

export { Toaster }
