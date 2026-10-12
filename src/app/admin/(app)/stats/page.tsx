import Link from "next/link";
import { requireRestaurant } from "@/lib/data";
import { addDays, DAY_ORDER, DAYS, formatDate, formatTime, isValidDate, STATUS_LABELS, todayIn } from "@/lib/format";
import { fetchReservationRows, isKept, type StatRow } from "@/lib/reservation-rows";
import { cardClass, inputClass } from "@/components/admin-styles";
import { BarChart, type Bar } from "@/components/bar-chart";
import { Heatmap } from "@/components/heatmap";
import { Segmented } from "@/components/segmented";
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
  const customers = new Map<string, Pick<Customer, "id" | "name" | "first_date" | "reservation_count" | "phone" | "email">>();
  for (let i = 0; i < customerIds.length; i += 200) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, first_date, reservation_count, phone, email")
      .in("id", customerIds.slice(i, i + 200));
    for (const c of data ?? []) customers.set(c.id, c);
  }
  const newCustomers = customerIds.filter((id) => (customers.get(id)?.first_date ?? from) >= from).length;

  // Remplissage = couverts servis / places offertes (places assises × services ouverts), services passés
  // uniquement (aujourd'hui exclu : le service n'est pas fini). Un service où des clients sont venus compte
  // aussi s'il n'était pas dans les horaires habituels.
  const seats = (tables ?? []).reduce((n, t) => n + t.seats, 0);
  const dinnerFrom = restaurant.dinner_from.slice(0, 5);
  const service = (time: string) => (time.slice(0, 5) >= dinnerFrom ? "soir" : "midi");
  let offered = 0;
  let seated = 0;
  if (seats) {
    for (let d = from; d <= to && d < today; d = addDays(d, 1)) {
      const dayRows = kept.filter((r) => r.date === d);
      const services = new Set([
        ...(restaurant.opening_hours[dow(d)] ?? []).map((range) => service(range.start)),
        ...dayRows.map((r) => service(r.time)),
      ]);
      for (const sv of services) {
        offered += seats;
        seated += Math.min(seats, sum(dayRows.filter((r) => service(r.time) === sv)));
      }
    }
  }
  const fillRate = offered ? (seated / offered) * 100 : null;
  const fmtPct = (n: number) => (n > 0 && n < 10 ? n.toFixed(1).replace(".", ",") : String(Math.round(n)));

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
  const statuses = (["confirmed", "seated", "finished", "pending", "no_show", "cancelled"] as ReservationStatus[]).map((st) => ({
    status: st,
    count: rows.filter((r) => r.status === st).length,
  }));

  const top = [...customerIds]
    .map((id) => ({ id, list: kept.filter((r) => r.customer_id === id) }))
    .sort((a, b) => b.list.length - a.list.length || sum(b.list) - sum(a.list))
    .slice(0, 10);

  // Comparaison avec la période précédente : seulement si elle contient des réservations.
  const hasPrevious = prevRows.length > 0;
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

  type Kpi = { label: string; info: string; value: string; d?: number | null; unit?: "%" | "pt"; hint?: string; lowerIsBetter?: boolean };
  const primary: Kpi[] = [
    { label: "Réservations", info: "Réservations maintenues, hors annulations et non-venues", value: String(s.reservations), d: delta(s.reservations, p.reservations), unit: "%" },
    { label: "Couverts", info: "Nombre de personnes attendues ou venues", value: String(s.covers), d: delta(s.covers, p.covers), unit: "%", hint: `${fmt1(s.coversPerDay)} par jour` },
    {
      label: "Remplissage",
      info: "Couverts servis ÷ places offertes (places assises × services ouverts), sur les services passés",
      value: fillRate == null ? "—" : `${fmtPct(fillRate)} %`,
      hint: fillRate == null ? (seats ? "aucun service passé sur la période" : "ajoutez vos tables dans Plan de salle") : `${seated} couverts sur ${offered} places offertes`,
    },
    { label: "No-show", info: "Part des réservations dont les clients ne sont pas venus", value: s.noShowRate == null ? "—" : `${s.noShowRate} %`, d: s.noShowRate != null && p.noShowRate != null ? s.noShowRate - p.noShowRate : null, unit: "pt", hint: plural(s.noShows, "client non venu", "clients non venus"), lowerIsBetter: true },
    { label: "Annulations", info: "Part des réservations annulées (par vous ou par le client)", value: s.cancelRate == null ? "—" : `${s.cancelRate} %`, d: s.cancelRate != null && p.cancelRate != null ? s.cancelRate - p.cancelRate : null, unit: "pt", hint: plural(s.cancelled, "annulation"), lowerIsBetter: true },
  ];
  const secondary: Kpi[] = [
    { label: "Pers. par table", info: "Nombre moyen de personnes par réservation", value: s.reservations ? fmt1(s.avgParty) : "—" },
    { label: "En ligne", info: "Part des réservations faites par vos clients en ligne", value: s.onlineRate == null ? "—" : `${s.onlineRate} %`, hint: `${online.length} en ligne · ${kept.length - online.length} par téléphone / sur place` },
    {
      label: "Délai moyen",
      info: "Combien de temps à l'avance vos clients réservent en ligne",
      value: s.avgLead == null ? "—" : s.avgLead < 0.5 ? "Le jour même" : `${fmt1(s.avgLead)} j avant`,
      hint: "réservations en ligne",
    },
    { label: "Nouveaux clients", info: "Clients dont c'est la première réservation", value: customerIds.length ? `${pct(newCustomers, customerIds.length)} %` : "—", hint: `${newCustomers} nouveaux · ${customerIds.length - newCustomers} déjà venus` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="text-stone-500">
            Du {formatDate(from)} au {formatDate(to)} ·{" "}
            {hasPrevious ? `comparé aux ${days} jours précédents` : `pas de réservation sur les ${days} jours précédents pour comparer`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented items={PRESETS.map((x) => ({ href: `?p=${x.key}`, label: x.label }))} active={preset ? PRESETS.findIndex((x) => x.key === preset) : -1} />
          <form className="flex items-center gap-1">
            <input type="date" name="from" defaultValue={from} className={`${inputClass} w-auto py-1.5`} aria-label="Du" />
            <span className="text-stone-500">→</span>
            <input type="date" name="to" defaultValue={to} className={`${inputClass} w-auto py-1.5`} aria-label="Au" />
            <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">OK</button>
          </form>
        </div>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {primary.map((k) => {
          const good = k.d != null && k.d !== 0 && (k.lowerIsBetter ? k.d < 0 : k.d > 0);
          return (
            <div key={k.label} className={`${cardClass} min-w-0`}>
              <p className="flex items-center gap-1 text-sm whitespace-nowrap text-stone-500">
                {k.label}
                <span title={k.info} aria-label={k.info} className="cursor-help text-xs text-stone-500">ⓘ</span>
              </p>
              <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
              {k.unit && hasPrevious && (
                <p className={`text-xs font-medium ${k.d == null || k.d === 0 ? "text-stone-500" : good ? "text-emerald-700" : "text-red-700"}`}>
                  {k.d == null ? "pas de comparaison" : k.d === 0 ? "= stable" : `${k.d > 0 ? "▲" : "▼"} ${Math.abs(k.d)}${k.unit === "pt" ? " pt" : " %"}`}
                  <span className="font-normal text-stone-500"> vs période préc.</span>
                </p>
              )}
              {k.hint && <p className="text-xs text-stone-500">{k.hint}</p>}
            </div>
          );
        })}
      </div>

      {/* Indicateurs secondaires, plus discrets */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-white/60 px-5 py-4 ring-1 ring-stone-900/[0.04] md:grid-cols-4">
        {secondary.map((k) => (
          <div key={k.label} className="min-w-0">
            <p className="flex items-center gap-1 text-xs whitespace-nowrap text-stone-500">
              {k.label}
              <span title={k.info} aria-label={k.info} className="cursor-help">ⓘ</span>
            </p>
            <p className="text-lg font-semibold tabular-nums">{k.value}</p>
            {k.hint && <p className="truncate text-xs text-stone-500" title={k.hint}>{k.hint}</p>}
          </div>
        ))}
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
                <div key={label as string} className="min-w-0 rounded-lg bg-stone-50 p-3">
                  <p className="text-stone-500">{label as string}</p>
                  <p className="text-xl font-semibold tabular-nums">{sum(list as StatRow[])}</p>
                  <p className="text-xs [overflow-wrap:anywhere] text-stone-500">
                    couverts · {pct(sum(list as StatRow[]), s.covers) ?? 0} % · {(list as StatRow[]).length} résa
                  </p>
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
                    <Link href={`/admin/clients/${id}`} className="font-medium hover:underline">{customers.get(id)?.name ?? list[0].name}</Link>
                    <span className="block text-xs text-stone-500">{[customers.get(id)?.phone, customers.get(id)?.email].filter(Boolean).join(" · ") || "—"}</span>
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
