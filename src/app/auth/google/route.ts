import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_COOKIE, googleOAuthConfig, hashNonce, randomToken, safeNext, siteOrigin } from "@/lib/google-oauth";

/** Départ de la connexion Google : redirige vers Google avec un retour sur notre domaine. */
export function GET(request: NextRequest) {
  const origin = siteOrigin(request.nextUrl.origin);
  const config = googleOAuthConfig();
  if (!config) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const state = randomToken();
  const nonce = randomToken();
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce: hashNonce(nonce),
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(url);
  // Vérifié au retour : protège contre les requêtes forgées (CSRF) et le rejeu du jeton.
  response.cookies.set(GOOGLE_COOKIE, JSON.stringify({ state, nonce, next }), {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/auth/google",
    maxAge: 600,
  });
  return response;
}
