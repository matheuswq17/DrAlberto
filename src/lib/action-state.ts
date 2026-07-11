/** Estado de retorno de server actions usadas com useActionState + ActionForm. */
export type ActionState = { ok: true } | { ok: false; error: string } | null;
