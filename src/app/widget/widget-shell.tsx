import type { CSSProperties, ReactNode } from "react";
import type { Restaurant } from "@/lib/types";
import { AutoHeight } from "./auto-height";

export type WidgetParams = { theme?: string; color?: string; frame?: string };

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function WidgetShell({
  restaurant,
  params,
  children,
}: {
  restaurant: Restaurant;
  params: WidgetParams;
  children: ReactNode;
}) {
  const color = params.color && HEX.test(params.color)
    ? `#${params.color.replace("#", "")}`
    : restaurant.primary_color;
  const dark = params.theme === "dark";

  return (
    <div
      id="baresto-widget"
      className={`${dark ? "dark" : ""} font-sans`}
      style={{ "--brand": color } as CSSProperties}
    >
      <div className="bg-white p-4 text-stone-800 sm:p-6 dark:bg-stone-900 dark:text-stone-100">
        {children}
        <p className="mt-6 text-center text-[11px] text-stone-400">
          Propulsé par Baresto
        </p>
      </div>
      <AutoHeight frameId={params.frame ?? ""} />
    </div>
  );
}
