/**
 * Supabase istemcisi — şimdilik tip düzeyinde placeholder.
 * Gerçek URL ve anahtarlar eklendiğinde createClient burada kullanılacak.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaderboardRow = Record<string, unknown>;

/** Henüz yapılandırılmadığında null; entegrasyon sonrası tek client örneği. */
export function getSupabaseClient(): SupabaseClient | null {
  return null;
}
