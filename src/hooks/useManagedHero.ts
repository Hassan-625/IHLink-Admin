import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ManagedPageKey } from "@/components/ManagedContentSections";

type ManagedHero = {
  id: string;
  eyebrow: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_link: string | null;
};

export function useManagedHero(pageKey: ManagedPageKey) {
  const [hero, setHero] = useState<ManagedHero | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) return;
      const { data } = await supabase
        .from("site_content_blocks")
        .select("id,eyebrow,title,body,image_url,cta_label,cta_link")
        .eq("page_key", pageKey)
        .eq("section_key", "hero")
        .eq("is_visible", true)
        .maybeSingle();
      if (active) setHero(data as ManagedHero | null);
    }
    void load();
    return () => { active = false; };
  }, [pageKey]);

  return hero;
}
