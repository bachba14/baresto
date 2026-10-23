import type { Instrumentation } from "next";

// Erreurs serveur (pages, API, Server Actions) journalisées pour la surveillance (voir lib/health.ts).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Redirections et 404 passent par des « erreurs » internes de Next.js : ce ne sont pas des pannes.
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  if (digest?.startsWith("NEXT_REDIRECT") || digest?.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND") return;
  try {
    const { recordServerError } = await import("./lib/health");
    await recordServerError({
      path: request.path,
      route: context.routePath,
      kind: context.routeType,
      message: err instanceof Error ? err.message : String(err),
      digest,
    });
  } catch (e) {
    console.error("[instrumentation]", e);
  }
};
