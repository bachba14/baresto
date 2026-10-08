import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GOOGLE_COOKIE, googleOAuthConfig, siteOrigin } from "@/lib/google-oauth";

/** Retour de Google : vérifie l'état, échange le code, puis ouvre la session Supabase. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const params = request.nextUrl.searchParams;
  const fail = (code: "oauth" | "link") => {
    const response = NextResponse.redirect(`${origin}/login?error=${code}`);
    response.cookies.delete({ name: GOOGLE_COOKIE, path: "/auth/google" });
    return response;
  };

  const config = googleOAuthConfig();
  if (!config || params.get("error")) return fail("oauth");

  let saved: { state: string; nonce: string; next: string };
  try {
    saved = JSON.parse(request.cookies.get(GOOGLE_COOKIE)?.value ?? "");
  } catch {
    return fail("link");
  }
  const code = params.get("code");
  if (!code || params.get("state") !== saved.state) return fail("link");

  // Échange du code contre les jetons Google (côté serveur : le secret ne quitte jamais le serveur).
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${origin}/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await tokenRes.json().catch(() => ({}))) as { id_token?: string };
  if (!tokenRes.ok || !tokens.id_token) return fail("oauth");

  // Supabase vérifie la signature du jeton, son audience (notre Client ID) et le nonce.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: tokens.id_token,
    nonce: saved.nonce,
  });
  if (error) return fail("oauth");

  const response = NextResponse.redirect(`${origin}${saved.next}`);
  response.cookies.delete({ name: GOOGLE_COOKIE, path: "/auth/google" });
  return response;
}
