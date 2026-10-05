import Link from "next/link";
import { Logo } from "@/components/logo";
import { logout } from "@/app/(auth)/actions";

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 sm:px-8">
        <Link href="/"><Logo /></Link>
        <form action={logout}>
          <button className="text-sm text-stone-500 hover:text-stone-900">Se déconnecter</button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}
