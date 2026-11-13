import { IconArrow } from "./icons";

/**
 * Champ e-mail + bouton : envoie vers /signup?email=… où l'adresse est pré-remplie.
 * Simple formulaire GET : fonctionne même sans JavaScript.
 */
export function EmailCta({ dark = false, id }: { dark?: boolean; id: string }) {
  return (
    <form action="/signup" method="get" className="w-full max-w-md">
      <div
        className={`flex flex-col gap-2 rounded-2xl p-1.5 sm:flex-row sm:rounded-full ${
          dark ? "bg-white/10 ring-1 ring-white/15" : "bg-white shadow-sm ring-1 ring-stone-900/10"
        }`}
      >
        <label htmlFor={id} className="sr-only">Votre e-mail professionnel</label>
        <input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@votre-restaurant.be"
          className={`min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[15px] outline-none ${
            dark ? "text-white placeholder:text-stone-400" : "placeholder:text-stone-400"
          }`}
        />
        <button
          type="submit"
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-[15px] font-semibold whitespace-nowrap text-white transition hover:bg-amber-600 sm:rounded-full"
        >
          Créer mon restaurant
          <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </form>
  );
}
