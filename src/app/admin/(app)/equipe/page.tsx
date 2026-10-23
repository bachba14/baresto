import type { Metadata } from "next";
import { cardClass } from "@/components/admin-styles";
import { requireAdmin } from "@/lib/data";
import { siteUrl } from "@/lib/site";
import { InviteForm, InvitationRow, MemberRow } from "./team";
import type { Role } from "./actions";

export const metadata: Metadata = { title: "Équipe" };

type Member = { user_id: string; email: string; role: Role; created_at: string };
type Invitation = { id: string; email: string; role: Role; token: string; expires_at: string };

export default async function TeamPage() {
  const { supabase, restaurant, userId } = await requireAdmin();
  const [{ data: members, error }, { data: invitations }, base] = await Promise.all([
    supabase.rpc("team_members", { p_restaurant: restaurant.id }),
    supabase
      .from("restaurant_invitations")
      .select("id, email, role, token, expires_at")
      .eq("restaurant_id", restaurant.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    siteUrl(),
  ]);
  if (error) throw new Error(error.message);

  const list = (members ?? []) as Member[];
  const pending = (invitations ?? []) as Invitation[];
  const adminCount = list.filter((m) => m.role === "owner").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Équipe</h1>
        <p className="text-stone-500">
          Invitez vos collègues. Les <strong className="font-medium text-stone-700">employés</strong> gèrent le service, les
          réservations et les fiches clients ; les <strong className="font-medium text-stone-700">administrateurs</strong>{" "}
          ont aussi accès à la carte, au plan de salle, aux réglages, aux statistiques et à l&apos;équipe.
        </p>
      </div>

      <section className={cardClass}>
        <h2 className="font-semibold">Inviter une personne</h2>
        <p className="mt-1 mb-4 text-sm text-stone-500">Elle reçoit un e-mail pour choisir son mot de passe. Le lien est valable 7 jours.</p>
        <InviteForm />
      </section>

      <section className={`${cardClass} p-0`}>
        <h2 className="px-5 pt-5 pb-2 font-semibold">Membres ({list.length})</h2>
        <ul className="divide-y divide-stone-100">
          {list.map((m) => (
            <MemberRow
              key={m.user_id}
              id={m.user_id}
              email={m.email}
              role={m.role}
              isMe={m.user_id === userId}
              lastAdmin={m.role === "owner" && adminCount <= 1}
            />
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section className={`${cardClass} p-0`}>
          <h2 className="px-5 pt-5 pb-2 font-semibold">Invitations en attente</h2>
          <ul className="divide-y divide-stone-100">
            {pending.map((i) => (
              <InvitationRow
                key={i.id}
                id={i.id}
                email={i.email}
                role={i.role}
                link={`${base}/invitation/${i.token}`}
                expired={new Date(i.expires_at) < new Date()}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
