
import type { ElementType, KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";

type StatItem = {
  label: string;
  value: number;
  icon: ElementType;
  grad?: string;
  iconBg?: string;
  accent?: string;
  sub: string;
  pct?: number;
  onClick?: () => void;
};

type DashboardStatsCardsProps = {
  items: StatItem[];
};

export default function DashboardStatsCards({
  items,
}: DashboardStatsCardsProps) {
  const columns =
    items.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4";

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    onClick?: () => void,
  ) => {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${columns}`}>
      {items.map(
        ({
          label,
          value,
          icon: Icon,
          iconBg,
          accent,
          sub,
          pct = 0,
          onClick,
        }) => {
          const safePct = Math.max(
            0,
            Math.min(Number.isFinite(pct) ? pct : 0, 100),
          );

          return (
            <div
              key={label}
              onClick={onClick}
              onKeyDown={(event) => handleKeyDown(event, onClick)}
              role={onClick ? "button" : undefined}
              tabIndex={onClick ? 0 : undefined}
              aria-label={onClick ? `${label}: ${value}. ${sub}` : undefined}
              className={`group relative min-w-0 rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 ${
                onClick
                  ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    iconBg ||
                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                  style={accent ? { color: accent } : undefined}
                >
                  <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                </div>

                {onClick && (
                  <ArrowUpRight
                    size={14}
                    className="text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-slate-500"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="mt-2">
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                <p className="mt-0.5 text-xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                  {value}
                </p>
              </div>

              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {sub}
                  </p>
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                    {Math.round(safePct)}%
                  </span>
                </div>

                <div
                  className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  role="progressbar"
                  aria-label={`${label} percentage`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(safePct)}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${safePct}%`,
                      backgroundColor: accent || "#64748b",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
