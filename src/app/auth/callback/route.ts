import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/google-oauth";

/** Retour de confirmation d'e-mail ou de connexion Google : ouvre la session puis continue vers `next`. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Adresse publique : derrière un proxy (Hostinger), l'origine vue par le serveur peut être interne.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
  const next = searchParams.get("next") ? safeNext(searchParams.get("next")) : "/onboarding";
  // Connexion Google annulée ou refusée par l'utilisateur.
  if (searchParams.get("error")) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Lien incomplet") };

  if (error) return NextResponse.redirect(`${origin}/login?error=link`);
  return NextResponse.redirect(`${origin}${next}`);
}
