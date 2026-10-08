import type { Metadata } from "next";
import { Geist_Mono, Inter, Momo_Trust_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const momoTrustDisplay = Momo_Trust_Display({
  variable: "--font-momo-trust-display",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Baresto", template: "%s · Baresto" },
  description: "Carte et réservations en ligne pour votre restaurant.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : la classe « js » est ajoutée avant l'hydratation.
    <html lang="fr" className={`${inter.variable} ${momoTrustDisplay.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Active les animations d'apparition seulement quand JavaScript tourne. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
