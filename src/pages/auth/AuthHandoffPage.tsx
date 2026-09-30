import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function AuthHandoffPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const tokenHash = params.get("token_hash");
      const next = params.get("next") || "/";
      if (!supabase || !tokenHash) { if (active) setError("Invalid administrator handoff."); return; }
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (!active) return;
      if (error) { setError("The secure administrator handoff could not be completed."); return; }
      navigate(next.startsWith("/") && !next.startsWith("//") ? next : "/", { replace: true });
    })();
    return () => { active = false; };
  }, [navigate, params]);
  return <div className="min-h-screen grid place-items-center bg-surface"><div className="rounded-2xl border bg-white p-8 text-center shadow-float"><h1 className="text-xl font-black">Opening IHLink platform</h1><p className="mt-2 text-sm text-muted">{error || "Transferring your authenticated administrator session securely…"}</p></div></div>;
}
