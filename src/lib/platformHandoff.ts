import { supabase } from "@/lib/supabase";
import { platformUrl, type PlatformKey } from "@/lib/platformUrls";

export async function openPlatformWithHandoff(platform: PlatformKey, destination: string) {
  const target = platformUrl(platform, "/auth/handoff");
  if (!supabase) { window.location.assign(platformUrl(platform, destination)); return; }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.assign("/signin"); return; }
  const { data, error } = await supabase.functions.invoke("auth-handoff", {
    headers: { Authorization: `Bearer ${session.access_token}` }, body: {},
  });
  if (error || !data?.token_hash) throw error || new Error("Unable to create secure platform handoff");
  const url = new URL(target, window.location.origin);
  url.searchParams.set("token_hash", data.token_hash);
  url.searchParams.set("next", destination.startsWith("/") ? destination : "/");
  window.location.assign(url.toString());
}
