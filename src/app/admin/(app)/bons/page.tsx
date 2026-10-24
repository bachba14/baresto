import type { Metadata } from "next";
import { cardClass } from "@/components/admin-styles";
import { Segmented } from "@/components/segmented";
import { requireRestaurant } from "@/lib/data";
import { formatDate, formatPrice, todayIn } from "@/lib/format";
import { GIFT_STATE_LABELS, GIFT_STATE_STYLES, giftCardState } from "@/lib/gift-cards";
import type { GiftCard } from "@/lib/types";
import { CreateGiftCardForm, GiftCardActions, MonthsForm } from "./forms";

export const metadata: Metadata = { title: "Bons cadeaux" };

const FILTERS = [
  { id: "valables", label: "Valables" },
  { id: "tous", label: "Tous" },
] as const;

export default async function GiftCardsPage({ searchParams }: PageProps<"/admin/bons">) {
  const [{ supabase, restaurant, isAdmin }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const today = todayIn(restaurant.timezone);
  const filter = params.filtre === "tous" ? "tous" : "valables";

  let query = supabase.from("gift_cards").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }).limit(300);
  if (filter === "valables") query = query.is("used_at", null).gte("expires_at", today);
  const { data } = await query;
  const cards = (data ?? []) as GiftCard[];
  const price = (n: number) => formatPrice(Number(n), restaurant.currency);
  const shortDate = (d: string) => formatDate(d).replace(/^\S+ /, "");

  // Montant des bons encore valables (dû aux clients) : utile pour la comptabilité.
  const { data: open } = isAdmin
    ? await supabase.from("gift_cards").select("amount").eq("restaurant_id", restaurant.id).is("used_at", null).gte("expires_at", today)
    : { data: null };
  const outstanding = (open ?? []).reduce((n, c) => n + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bons cadeaux</h1>
        <p className="text-stone-500">
          Vendez un bon au comptoir ou par téléphone, puis créez-le ici : imprimez-le ou envoyez-le par e-mail. Quand le
          client le présente, marquez-le « utilisé ».
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`${cardClass} space-y-3`}>
          <h2 className="font-semibold">Nouveau bon</h2>
          <CreateGiftCardForm currency={restaurant.currency} months={restaurant.gift_card_months ?? 12} />
        </section>
        {isAdmin && (
          <section className={`${cardClass} space-y-4`}>
            <div>
              <p className="text-sm text-stone-500">Bons valables en circulation</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{price(outstanding)}</p>
            </div>
            <MonthsForm months={restaurant.gift_card_months ?? 12} />
          </section>
        )}
      </div>

      <section className={`${cardClass} p-0`}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="font-semibold">Bons</h2>
          <div className="w-56">
            <Segmented items={FILTERS.map((f) => ({ href: `/admin/bons?filtre=${f.id}`, label: f.label }))} active={filter === "tous" ? 1 : 0} />
          </div>
        </div>
        {cards.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-stone-500">{filter === "valables" ? "Aucun bon valable pour l'instant." : "Aucun bon pour l'instant."}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {cards.map((c) => {
              const state = giftCardState(c, today);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <span className="w-20 shrink-0 font-semibold tabular-nums">{price(c.amount)}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    {c.recipient_name ? <>Pour <strong>{c.recipient_name}</strong></> : <span className="text-stone-400">Sans nom</span>}
                    {c.offered_by && <span className="text-stone-500"> · de la part de {c.offered_by}</span>}
                    <span className="block text-xs text-stone-500">
                      Créé le {shortDate(c.created_at.slice(0, 10))} · valable jusqu&apos;au {shortDate(c.expires_at)}
                      {c.used_at && <> · utilisé le {shortDate(c.used_at.slice(0, 10))}</>}
                    </span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${GIFT_STATE_STYLES[state]}`}>{GIFT_STATE_LABELS[state]}</span>
                  <GiftCardActions id={c.id} token={c.token} used={Boolean(c.used_at)} email={c.send_email} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
