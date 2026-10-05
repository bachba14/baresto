"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-lg rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="font-semibold text-red-800">Une erreur est survenue</h2>
      <p className="mt-1 text-sm text-red-700">{error.message}</p>
      <button onClick={reset} className="mt-3 text-sm font-medium text-red-800 underline">
        Réessayer
      </button>
    </div>
  );
}
