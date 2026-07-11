"use client";

import { useActionState, useEffect } from "react";
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
 */
export function ActionForm({
  action,
  successMessage,
  className,
  children,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  successMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toastManager.add({ title: successMessage, type: "success", timeout: 3000 });
    } else {
      toastManager.add({ title: state.error, type: "error", timeout: 3000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
