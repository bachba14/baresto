import { getFloor, requireRestaurant } from "@/lib/data";
import { cardClass, inputClass } from "@/components/admin-styles";
import { SubmitButton } from "@/components/admin-ui";
import { createRoom } from "./actions";
import { FloorEditor } from "./floor-editor";
import { QuickSetup } from "./quick-setup";

export default async function FloorPage({ searchParams }: PageProps<"/admin/floor">) {
  const [{ supabase, restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const { rooms, tables } = await getFloor(supabase, restaurant.id);
  const roomParam = typeof params.room === "string" ? params.room : undefined;
  const current = rooms.find((r) => r.id === roomParam) ?? rooms[0];

  const online = tables.filter((t) => t.bookable_online);
  const seats = tables.reduce((n, t) => n + t.seats, 0);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plan de salle</h1>
        <p className="text-stone-500">
          {tables.length} tables · {seats} places · {online.length} tables réservables en ligne.
        </p>
      </div>

      {tables.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Aucune table : les réservations en ligne sont limitées seulement par le nombre de couverts par créneau
          ({restaurant.max_covers_per_slot}). Configurez vos tables pour que chaque réservation reçoive une vraie table
          {restaurant.auto_confirm ? " — indispensable avec la confirmation automatique." : "."}
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Chaque réservation en ligne est placée automatiquement sur la plus petite table libre (ou deux tables
          combinables). S&apos;il n&apos;y a plus de table adaptée, le créneau n&apos;est plus proposé.
          {restaurant.auto_confirm && " Les réservations sont confirmées sans votre intervention."}
        </p>
      )}

      <QuickSetup hasTables={tables.length > 0} />

      <div className="flex flex-wrap items-center gap-2">
        {rooms.map((r) => (
          <a
            key={r.id}
            href={`?room=${r.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              r.id === current?.id ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700"
            }`}
          >
            {r.name} ({tables.filter((t) => t.room_id === r.id).length})
          </a>
        ))}
        <form action={createRoom} className="flex gap-1">
          <input name="name" placeholder="Nouvelle salle" className={`${inputClass} w-40`} />
          <SubmitButton variant="secondary">+ Ajouter</SubmitButton>
        </form>
      </div>

      {current ? (
        <FloorEditor
          key={current.id}
          room={current}
          initialTables={tables.filter((t) => t.room_id === current.id)}
          canDelete={rooms.length > 1}
        />
      ) : (
        <p className={cardClass}>Créez une salle ou utilisez la configuration rapide.</p>
      )}
    </div>
  );
}
