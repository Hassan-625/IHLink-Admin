import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type UserRole =
  "super_admin" | "platform_admin" | "support" | "finance" | "customer";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  middle_name?: string | null;
  last_name: string | null;
  phone?: string | null;
  sex?: "male" | "female" | "prefer_not_to_say" | null;
  newsletter_opt_in?: boolean;
  role: UserRole;
  status: "active" | "suspended" | "invited";
  created_at?: string;
}
export type ProductKey = "corporate" | "datasub" | "schoolpro" | "consult" | "host" | "engineering" | "business_centre" | "print" | "fabrication" | "compute" | "academy" | "digital_business";
export interface AdminProductAccess { product: ProductKey; can_view: boolean; can_edit: boolean; can_approve: boolean; can_delete: boolean; can_manage: boolean; can_use_website_builder: boolean; can_use_command_center: boolean; }
export interface CustomerServiceAccess { product: ProductKey; status: "active" | "pending" | "suspended"; plan_name: string | null; }

interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  sex: string;
  newsletterOptIn: boolean;
  service: string;
}

interface AuthValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  adminAccess: AdminProductAccess[];
  serviceAccess: CustomerServiceAccess[];
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsVerification: boolean; existingAccount: boolean }>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);
const REMEMBER_KEY = "ih_remember_device";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [adminAccess, setAdminAccess] = useState<AdminProductAccess[]>([]);
  const [serviceAccess, setServiceAccess] = useState<CustomerServiceAccess[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;

    // The client stores ordinary sessions in this tab; device persistence requires consent.
    // Mounting another page must not revoke an already authenticated session.

    const loadProfile = async (current: Session | null) => {
      setSession(current);
      if (!current?.user) {
        setProfile(null);
        setAdminAccess([]);
        setServiceAccess([]);
        setLoading(false);
        return;
      }
      const [{ data }, { data: accessRows }, { data: serviceRows }] = await Promise.all([
        client.from("profiles").select("*").eq("id", current.user.id).maybeSingle(),
        client.from("admin_product_access").select("product,can_view,can_edit,can_approve,can_delete,can_manage,can_use_website_builder,can_use_command_center").eq("user_id", current.user.id),
        client.from("customer_service_access").select("product,status,plan_name").eq("user_id", current.user.id),
      ]);
      if (active) {
        setProfile((data as UserProfile | null) || null);
        setAdminAccess((accessRows || []) as AdminProductAccess[]);
        setServiceAccess((serviceRows || []) as CustomerServiceAccess[]);
        setLoading(false);
      }
    };

    client.auth.getSession().then(({ data }) => void loadProfile(data.session));
    const { data: listener } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        // Keep the auth callback synchronous. Supabase documents that awaiting
        // other client calls from this callback can deadlock subsequent calls.
        setSession(nextSession);
        if (!nextSession?.user) {
          setProfile(null);
          setAdminAccess([]);
          setServiceAccess([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        window.setTimeout(() => {
          if (active) void loadProfile(nextSession);
        }, 0);
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user || !profile) return;
    const client = supabase;
    const timeoutMs = profile.role === "super_admin" || profile.role === "platform_admin" || profile.role === "support" || profile.role === "finance"
      ? 15 * 60 * 1000
      : 30 * 60 * 1000;
    let timer = window.setTimeout(() => void client.auth.signOut({ scope: "local" }), timeoutMs);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void client.auth.signOut({ scope: "local" }), timeoutMs);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [profile, session?.user]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      adminAccess,
      serviceAccess,
      loading,
      configured: isSupabaseConfigured,
      async signIn(email, password) {
        if (!supabase)
          return "Authentication is awaiting the Supabase connection.";
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return error?.message ?? null;
      },
      async signUp({ email, password, firstName, middleName, lastName, phone, sex, newsletterOptIn, service }) {
        if (!supabase)
          return { error: "Authentication is awaiting the Supabase connection.", needsVerification: false, existingAccount: false };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/signin?verified=1`,
            data: {
              first_name: firstName,
              middle_name: middleName,
              last_name: lastName,
              phone,
              sex,
              newsletter_opt_in: newsletterOptIn,
              requested_service: service,
            },
          },
        });
        if (error) return { error: error.message, needsVerification: false, existingAccount: false };
        const identities = data.user?.identities;
        const existingAccount = Array.isArray(identities) && identities.length === 0;
        return { error: null, needsVerification: !data.session && !existingAccount, existingAccount };
      },
      async signInWithGoogle() {
        if (!supabase)
          return "Google sign-in is awaiting the Supabase connection.";
        const next = sessionStorage.getItem("ih_auth_next");
        const callback = new URL("/signin", window.location.origin);
        if (next && next.startsWith("/") && !next.startsWith("//")) callback.searchParams.set("next", next);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: callback.toString() },
        });
        return error?.message ?? null;
      },
      async signOut() {
        if (supabase) {
          await supabase.auth.signOut({ scope: "local" });
          setSession(null);
          setProfile(null);
          setAdminAccess([]);
          setServiceAccess([]);
          sessionStorage.removeItem("ih_auth_next");
          localStorage.removeItem(REMEMBER_KEY);
        }
      },
      async resetPassword(email) {
        if (!supabase)
          return "Password recovery is awaiting the Supabase connection.";
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        return error?.message ?? null;
      },
    }),
    [adminAccess, serviceAccess, loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
