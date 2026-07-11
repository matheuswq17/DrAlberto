"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { toastManager } from "@/components/ui/toast";

/**
 * <form> ligado a uma server action (assinatura useActionState) que dispara
 * um toast de confirmação/erro sozinho — sem precisar de redirect nem de
 * lógica de feedback repetida em cada página.
 *
 * `children` é ReactNode normal (não função): Server Components só podem
 * passar elementos serializáveis para um Client Component, nunca uma função
 * render-prop. Use <SubmitButton> dentro do form para reagir ao estado
 * pendente via useFormStatus.
 *
 * `trackUnsaved` liga o indicador "Alterações não salvas" (Configurações):
 * detecta edição via bubbling do evento `change` nativo dos campos, avisa
 * antes de recarregar/fechar a aba enquanto houver edição pendente, e limpa
 * o aviso depois de um salvamento bem-sucedido.
 */
export function ActionForm({
  action,
  successMessage,
  className,
  children,
  trackUnsaved = false,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  successMessage: string;
  className?: string;
  children: React.ReactNode;
  trackUnsaved?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    null
  );
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toastManager.add({
        title: state.message ?? successMessage,
        type: "success",
        timeout: 3000,
      });
      setDirty(false);
    } else {
      toastManager.add({ title: state.error, type: "error", timeout: 3000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!trackUnsaved || !dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [trackUnsaved, dirty]);

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        onChange={trackUnsaved ? () => setDirty(true) : undefined}
      >
        {children}
      </form>
      {trackUnsaved && dirty && (
        <p
          role="status"
          className="mt-2 text-xs font-medium text-status-warning-foreground"
        >
          Alterações não salvas
        </p>
      )}
    </>
  );
}
