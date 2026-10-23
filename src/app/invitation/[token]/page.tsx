import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/app/(auth)/auth-shell";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import { AcceptForm, CreateAccountForm } from "./join-form";
import { switchAccount } from "./actions";

export const metadata: Metadata = { title: "Invitation", robots: { index: false } };

const ROLE = { owner: "administrateur", staff: "membre de l'équipe" } as const;

type Info = { restaurant_name: string; email: string; role: keyof typeof ROLE };

export default async function InvitationPage({ params }: PageProps<"/invitation/[token]">) {
  const { token } = await params;
  const valid = /^[a-f0-9]{64}$/.test(token);
  const { data } = valid ? await createPublicClient().rpc("invitation_info", { p_token: token }) : { data: null };
  const info = (data as Info[] | null)?.[0];

  if (!info) {
    return (
      <AuthShell title="Invitation expirée" subtitle="Ce lien n'est plus valable.">
        <p className="text-sm text-stone-600">
          Il a peut-être déjà été utilisé, ou il date de plus de 7 jours. Demandez une nouvelle invitation à
          l&apos;administrateur du restaurant.
        </p>
        <p className="mt-6 text-sm text-stone-500">
          Déjà membre ? <Link href="/login" className="font-medium text-amber-700 hover:underline">Se connecter</Link>
        </p>
      </AuthShell>
    );
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const current = (auth?.claims?.email as string | undefined)?.toLowerCase();
  const title = `Rejoindre ${info.restaurant_name}`;
  const subtitle = `Vous êtes invité en tant que ${ROLE[info.role]} sur Monkomi.`;

  if (current && current !== info.email) {
    return (
      <AuthShell title={title} subtitle={subtitle}>
        <p className="text-sm text-stone-600">
          Vous êtes connecté avec <strong>{current}</strong>, mais cette invitation a été envoyée à{" "}
          <strong>{info.email}</strong>.
        </p>
        <form action={switchAccount.bind(null, token)} className="mt-4">
          <button className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700">
            Changer de compte
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {current ? <AcceptForm token={token} /> : <CreateAccountForm token={token} email={info.email} />}
    </AuthShell>
  );
}
