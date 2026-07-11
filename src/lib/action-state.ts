/** Estado de retorno de server actions usadas com useActionState + ActionForm. */
export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string }
  | null;
