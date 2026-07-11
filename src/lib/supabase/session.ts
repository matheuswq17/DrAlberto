import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface SessionProfile {
  user: { id: string; email?: string | null } | null;
  profile: { name: string | null; role: string | null } | null;
}

/**
 * Usuário + perfil da sessão atual, memoizado por requisição (React.cache).
 * Layout e página evitam repetir a mesma leitura de auth.getUser() + profiles
 * — nunca persiste entre requisições/usuários, o cache é resetado a cada
 * render do App Router.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  return { user, profile: profile ?? null };
});
