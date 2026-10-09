import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { addDays, DAY_ORDER, DAYS, formatDate, formatTime, isValidDate, STATUS_LABELS, todayIn } from "@/lib/format";
import { fetchReservationRows, isKept, type StatRow } from "@/lib/reservation-rows";
import { cardClass, inputClass } from "@/components/admin-styles";
import { BarChart, type Bar } from "@/components/bar-chart";
import { Heatmap } from "@/components/heatmap";
import type { Customer, ReservationStatus } from "@/lib/types";

const PRESETS = [
  { key: "7", label: "7 jours" },
  { key: "30", label: "30 jours" },
  { key: "90", label: "3 mois" },
  { key: "365", label: "12 mois" },
] as const;

const dayCount = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
const dow = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const shortDate = (d: string) => `${Number(d.slice(8, 10))}/${d.slice(5, 7)}`;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);
const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");
const sum = (rows: StatRow[]) => rows.reduce((n, r) => n + r.party_size, 0);

/** Écart avec la période précédente, en %. */
function delta(now: number, before: number) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

function summarize(rows: StatRow[], days: number) {
  const kept = rows.filter(isKept);
  const noShows = rows.filter((r) => r.status === "no_show").length;
  const cancelled = rows.filter((r) => r.status === "cancelled").length;
  const online = kept.filter((r) => r.source === "widget");
  const leadDays = online.map((r) => Math.max(0, (Date.parse(r.date) - Date.parse(r.created_at.slice(0, 10))) / 86_400_000));
  return {
    reservations: kept.length,
    covers: sum(kept),
    coversPerDay: sum(kept) / days,
    avgParty: kept.length ? sum(kept) / kept.length : 0,
    noShowRate: pct(noShows, kept.length + noShows),
    noShows,
    cancelRate: pct(cancelled, rows.length),
    cancelled,
    onlineRate: pct(online.length, kept.length),
    avgLead: leadDays.length ? leadDays.reduce((a, b) => a + b, 0) / leadDays.length : null,
  };
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const today = todayIn(restaurant.timezone);

  // Période : préréglage (N derniers jours) ou dates choisies.
  const custom = isValidDate(params.from) && isValidDate(params.to) && params.from <= params.to;
  const preset = PRESETS.find((p) => p.key === params.p)?.key ?? (custom ? null : "30");
  const to = custom ? (params.to as string) : today;
  let from = custom ? (params.from as string) : addDays(today, -(Number(preset) - 1));
  if (dayCount(from, to) > 731) from = addDays(to, -730);
  const days = dayCount(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));

  const [rows, prevRows, { data: tables }] = await Promise.all([
    fetchReservationRows(supabase, restaurant.id, from, to),
    fetchReservationRows(supabase, restaurant.id, prevFrom, prevTo),
    supabase.from("dining_tables").select("seats").eq("restaurant_id", restaurant.id),
  ]);
  const kept = rows.filter(isKept);
  const s = summarize(rows, days);
  const p = summarize(prevRows, days);

  // Clients nouveaux / fidèles : première réservation pendant la période ou avant.
  const customerIds = [...new Set(kept.map((r) => r.customer_id).filter(Boolean))] as string[];
  const customers = new Map<string, Pick<Customer, "id" | "name" | "first_date" | "reservation_count">>();
  for (let i = 0; i < customerIds.length; i += 200) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, first_date, reservation_count")
      .in("id", customerIds.slice(i, i + 200));
    for (const c of data ?? []) customers.set(c.id, c);
  }
  const newCustomers = customerIds.filter((id) => (customers.get(id)?.first_date ?? from) >= from).length;

  // Remplissage : couverts d'un service / places assises (une rotation), services passés uniquement.
  const seats = (tables ?? []).reduce((n, t) => n + t.seats, 0);
  const dinnerFrom = restaurant.dinner_from.slice(0, 5);
  const service = (time: string) => (time.slice(0, 5) >= dinnerFrom ? "soir" : "midi");
  const fill: number[] = [];
  if (seats) {
    for (let d = from; d <= to && d < today; d = addDays(d, 1)) {
      for (const range of restaurant.opening_hours[dow(d)] ?? []) {
        const sv = service(range.start);
        const covers = sum(kept.filter((r) => r.date === d && service(r.time) === sv));
        fill.push(Math.min(1, covers / seats));
      }
    }
  }
  const fillRate = fill.length ? Math.round((fill.reduce((a, b) => a + b, 0) / fill.length) * 100) : null;

  // ── Séries des graphiques ──
  const weekly = days > 92;
  const buckets = new Map<string, { count: number; covers: number }>();
  for (let d = from; d <= to; d = addDays(d, weekly ? 7 : 1)) buckets.set(d, { count: 0, covers: 0 });
  for (const r of kept) {
    const index = dayCount(from, r.date) - 1;
    const key = weekly ? addDays(from, index - (index % 7)) : r.date;
    const b = buckets.get(key);
    if (b) {
      b.count++;
      b.covers += r.party_size;
    }
  }
  const timeline: Bar[] = [...buckets].map(([d, v]) => ({
    key: d,
    label: shortDate(d),
    value: v.covers,
    tooltip: `${weekly ? "Semaine du " : `${DAYS[dow(d)]} `}${shortDate(d)} : ${v.covers} couverts · ${v.count} réservation${v.count > 1 ? "s" : ""}`,
    muted: d > today,
  }));

  const weekdayBars: Bar[] = DAY_ORDER.map((d) => {
    const occurrences = Array.from({ length: days }, (_, i) => addDays(from, i)).filter((x) => dow(x) === d).length;
    const avg = occurrences ? Math.round(sum(kept.filter((r) => dow(r.date) === d)) / occurrences) : 0;
    return { key: String(d), label: DAYS[d].slice(0, 3), value: avg, tooltip: `${DAYS[d]} : ${avg} couverts en moyenne` };
  });

  const times = [...new Set(kept.map((r) => r.time.slice(0, 5)))].sort();
  const timeBars: Bar[] = times.map((t) => {
    const covers = sum(kept.filter((r) => r.time.slice(0, 5) === t));
    return { key: t, label: formatTime(t), value: covers, tooltip: `Arrivées à ${formatTime(t)} : ${covers} couverts` };
  });

  const hours = [...new Set(kept.map((r) => r.time.slice(0, 2)))].sort();
  const weeksPerDay = (d: number) => Math.max(1, Array.from({ length: days }, (_, i) => addDays(from, i)).filter((x) => dow(x) === d).length);
  const heat = (d: string, h: string) =>
    Math.round(sum(kept.filter((r) => dow(r.date) === Number(d) && r.time.slice(0, 2) === h)) / weeksPerDay(Number(d)));

  const maxParty = Math.min(12, Math.max(2, ...kept.map((r) => r.party_size)));
  const partyBars: Bar[] = Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => {
    const count = kept.filter((r) => (n === maxParty ? r.party_size >= n : r.party_size === n)).length;
    const label = n === maxParty && kept.some((r) => r.party_size > n) ? `${n}+` : String(n);
    return { key: String(n), label, value: count, tooltip: `${label} pers. : ${count} réservation${count > 1 ? "s" : ""}` };
  });

  const LEAD = [
    { label: "Jour même", min: 0, max: 0 },
    { label: "1–2 j", min: 1, max: 2 },
    { label: "3–7 j", min: 3, max: 7 },
    { label: "8–14 j", min: 8, max: 14 },
    { label: "15–30 j", min: 15, max: 30 },
    { label: "30 j +", min: 31, max: Infinity },
  ];
  const leadOf = (r: StatRow) => Math.max(0, Math.round((Date.parse(r.date) - Date.parse(r.created_at.slice(0, 10))) / 86_400_000));
  const online = kept.filter((r) => r.source === "widget");
  const leadBars: Bar[] = LEAD.map((b) => {
    const count = online.filter((r) => leadOf(r) >= b.min && leadOf(r) <= b.max).length;
    return { key: b.label, label: b.label, value: count, tooltip: `Réservé ${b.label === "Jour même" ? "le jour même" : `${b.label} avant`} : ${count}` };
  });

  const lunch = kept.filter((r) => service(r.time) === "midi");
  const statuses = (["confirmed", "seated", "pending", "no_show", "cancelled"] as ReservationStatus[]).map((st) => ({
    status: st,
    count: rows.filter((r) => r.status === st).length,
  }));

  const top = [...customerIds]
    .map((id) => ({ id, list: kept.filter((r) => r.customer_id === id) }))
    .sort((a, b) => b.list.length - a.list.length || sum(b.list) - sum(a.list))
    .slice(0, 10);

  const kpis: { label: string; value: string; d: number | null; hint?: string; lowerIsBetter?: boolean }[] = [
    { label: "Réservations", value: String(s.reservations), d: delta(s.reservations, p.reservations) },
    { label: "Couverts", value: String(s.covers), d: delta(s.covers, p.covers), hint: `${fmt1(s.coversPerDay)} par jour` },
    { label: "Taille moyenne des tables", value: `${fmt1(s.avgParty)} pers.`, d: delta(s.avgParty, p.avgParty) },
    { label: "Taux de no-show", value: s.noShowRate == null ? "—" : `${s.noShowRate} %`, d: s.noShowRate != null && p.noShowRate != null ? s.noShowRate - p.noShowRate : null, hint: `${s.noShows} client${s.noShows > 1 ? "s" : ""} non venu${s.noShows > 1 ? "s" : ""}`, lowerIsBetter: true },
    { label: "Taux d'annulation", value: s.cancelRate == null ? "—" : `${s.cancelRate} %`, d: s.cancelRate != null && p.cancelRate != null ? s.cancelRate - p.cancelRate : null, hint: `${s.cancelled} annulation${s.cancelled > 1 ? "s" : ""}`, lowerIsBetter: true },
    { label: "Réservé en ligne", value: s.onlineRate == null ? "—" : `${s.onlineRate} %`, d: null, hint: `${kept.length - online.length} par téléphone / sur place` },
    { label: "Réservé en moyenne", value: s.avgLead == null ? "—" : `${fmt1(s.avgLead)} j avant`, d: null, hint: "réservations en ligne" },
    { label: "Nouveaux clients", value: customerIds.length ? `${pct(newCustomers, customerIds.length)} %` : "—", d: null, hint: `${newCustomers} nouveaux · ${customerIds.length - newCustomers} déjà venus` },
    ...(fillRate != null ? [{ label: "Remplissage moyen", value: `${fillRate} %`, d: null, hint: `par service, sur ${seats} places` }] : []),
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="text-stone-500">
            Du {formatDate(from)} au {formatDate(to)} · comparé aux {days} jours précédents
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((x) => (
            <Link
              key={x.key}
              href={`?p=${x.key}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${x.key === preset ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}
            >
              {x.label}
            </Link>
          ))}
          <form className="flex items-center gap-1">
            <input type="date" name="from" defaultValue={from} className={`${inputClass} w-auto py-1.5`} aria-label="Du" />
            <span className="text-stone-400">→</span>
            <input type="date" name="to" defaultValue={to} className={`${inputClass} w-auto py-1.5`} aria-label="Au" />
            <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">OK</button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => {
          const good = k.d != null && k.d !== 0 && (k.lowerIsBetter ? k.d < 0 : k.d > 0);
          return (
            <div key={k.label} className={cardClass}>
              <p className="text-sm text-stone-500">{k.label}</p>
              <p className="text-2xl font-semibold">{k.value}</p>
              {k.d != null && k.d !== 0 && (
                <p className={`text-xs font-medium ${good ? "text-emerald-700" : "text-red-700"}`}>
                  {k.d > 0 ? "▲" : "▼"} {Math.abs(k.d)}{k.lowerIsBetter ? " pt" : " %"} vs période précédente
                </p>
              )}
              {k.hint && <p className="text-xs text-stone-500">{k.hint}</p>}
            </div>
          );
        })}
      </div>

      <section className={cardClass}>
        <h2 className="font-medium">Couverts {weekly ? "par semaine" : "par jour"}</h2>
        <p className="mb-4 text-xs text-stone-500">Hors annulations et non-venues · barres claires : jours à venir déjà réservés</p>
        <BarChart bars={timeline} unit="couverts" height={200} labelEvery={Math.max(1, Math.ceil(timeline.length / 12))} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className="font-medium">Couverts moyens par jour de la semaine</h2>
          <p className="mb-4 text-xs text-stone-500">Pour prévoir le personnel jour par jour</p>
          <BarChart bars={weekdayBars} unit="couverts" />
        </section>
        <section className={cardClass}>
          <h2 className="font-medium">Heures d&apos;arrivée</h2>
          <p className="mb-4 text-xs text-stone-500">Couverts par créneau, sur toute la période</p>
          {timeBars.length ? <BarChart bars={timeBars} unit="couverts" labelEvery={Math.max(1, Math.ceil(timeBars.length / 10))} /> : <p className="text-sm text-stone-500">Pas encore de données.</p>}
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="font-medium">Affluence par jour et par heure</h2>
        <p className="mb-4 text-xs text-stone-500">Couverts moyens arrivant chaque heure · plus la case est foncée, plus il y a de monde</p>
        {hours.length ? (
          <Heatmap
            rows={DAY_ORDER.map((d) => ({ key: String(d), label: DAYS[d].slice(0, 3) }))}
            columns={hours.map((h) => ({ key: h, label: `${Number(h)}h` }))}
            value={heat}
            tooltip={(d, h) => `${DAYS[Number(d)]} ${Number(h)}h : ${heat(d, h)} couverts en moyenne`}
          />
        ) : (
          <p className="text-sm text-stone-500">Pas encore de données.</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={cardClass}>
          <h2 className="font-medium">Taille des tables</h2>
          <p className="mb-4 text-xs text-stone-500">Nombre de réservations par nombre de personnes</p>
          <BarChart bars={partyBars} unit="réservations" />
        </section>
        <section className={cardClass}>
          <h2 className="font-medium">Délai de réservation</h2>
          <p className="mb-4 text-xs text-stone-500">Combien de temps à l&apos;avance on réserve en ligne</p>
          <BarChart bars={leadBars} unit="réservations" />
        </section>
        <section className={`${cardClass} space-y-4`}>
          <div>
            <h2 className="font-medium">Midi / soir</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {[["Midi", lunch], ["Soir", kept.filter((r) => service(r.time) === "soir")]].map(([label, list]) => (
                <div key={label as string} className="rounded-lg bg-stone-50 p-3">
                  <p className="text-stone-500">{label as string}</p>
                  <p className="text-xl font-semibold">{sum(list as StatRow[])} couverts</p>
                  <p className="text-xs text-stone-500">{pct(sum(list as StatRow[]), s.covers) ?? 0} % · {(list as StatRow[]).length} résa</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-medium">Statuts</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {statuses.map((x) => (
                <li key={x.status} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-stone-600">{STATUS_LABELS[x.status]}</span>
                  <span className="h-2 rounded-full bg-amber-600" style={{ width: `${(x.count / Math.max(1, rows.length)) * 100}%`, minWidth: x.count ? 4 : 0 }} />
                  <span className="tabular-nums text-stone-600">{x.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="font-medium">Meilleurs clients de la période</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Pas encore de clients sur cette période.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm tabular-nums">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                <th className="py-1 font-medium">Client</th>
                <th className="py-1 font-medium">Réservations</th>
                <th className="py-1 font-medium">Couverts</th>
                <th className="py-1 font-medium">Dernière venue</th>
              </tr>
            </thead>
            <tbody>
              {top.map(({ id, list }) => (
                <tr key={id} className="border-b border-stone-100">
                  <td className="py-1.5">
                    <Link href={`/admin/clients/${id}`} className="hover:underline">{customers.get(id)?.name ?? list[0].name}</Link>
                  </td>
                  <td className="py-1.5">{list.length}</td>
                  <td className="py-1.5">{sum(list)}</td>
                  <td className="py-1.5 first-letter:uppercase">{formatDate(list[list.length - 1].date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
