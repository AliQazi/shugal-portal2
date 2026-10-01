import { MouseEvent, useEffect, useState } from "react";
import {
  getTopAgentsReport,
  TopAgentRow,
  TopAgentsRange,
} from "../../Api/bookingApi";

const RANGES: { value: TopAgentsRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "90d", label: "90 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
];

const RANK_BADGE = [
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
];

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
};

// index.css hides the native calendar icon on date inputs, so open the picker on click.
const openPicker = (e: MouseEvent<HTMLInputElement>) => {
  try {
    e.currentTarget.showPicker();
  } catch {
    // showPicker unsupported or blocked — the field stays typeable.
  }
};

export default function TopAgentsReport() {
  const [range, setRange] = useState<TopAgentsRange>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [agents, setAgents] = useState<TopAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isCustom = Boolean(fromDate || toDate);

  const selectPreset = (value: TopAgentsRange) => {
    setRange(value);
    setFromDate("");
    setToDate("");
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getTopAgentsReport({
      range,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      limit: 10,
    })
      .then((res) => {
        if (!cancelled) setAgents(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, fromDate, toDate]);

  const topRevenue = agents[0]?.total.revenue || 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Group Ticket
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Umrah Package
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700/60 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => selectPreset(r.value)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${!isCustom && range === r.value
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div
            className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[11px] ${isCustom
                ? "border-blue-300 dark:border-blue-700"
                : "border-gray-200 dark:border-gray-600"
              }`}
          >
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              onClick={openPicker}
              aria-label="From date"
              className="bg-transparent text-gray-700 dark:text-gray-200 outline-none cursor-pointer dark:scheme-dark"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              onClick={openPicker}
              aria-label="To date"
              className="bg-transparent text-gray-700 dark:text-gray-200 outline-none cursor-pointer dark:scheme-dark"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          Could not load the agent report.
        </p>
      ) : agents.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          No agent sales in this period.
        </p>
      ) : (
        <ol className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {agents.map((agent, i) => {
            const barWidth = topRevenue ? (agent.total.revenue / topRevenue) * 100 : 0;
            const groupShare = agent.total.revenue
              ? (agent.group.revenue / agent.total.revenue) * 100
              : 0;

            return (
              <li key={agent.agentId} className="flex items-center gap-3 py-2">
                <span
                  className={`shrink-0 h-6 w-6 rounded-full text-[11px] font-bold flex items-center justify-center ${RANK_BADGE[i] ||
                    "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                >
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-white"
                      title={agent.companyName ? `${agent.companyName} (${agent.contactName})` : agent.contactName}
                    >
                      {agent.name}
                      {agent.companyName && agent.contactName && (
                        <span className="ml-1.5 text-[11px] font-normal text-gray-500 dark:text-gray-400">
                          ({agent.contactName})
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                      PKR {formatCompact(agent.total.revenue)}
                    </span>
                  </div>

                  <div
                    className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div className="flex h-full" style={{ width: `${barWidth}%` }}>
                      <div className="h-full bg-blue-500" style={{ width: `${groupShare}%` }} />
                      <div className="h-full bg-emerald-500 flex-1" />
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                    <span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Group Ticket</span>{" "}
                      {agent.group.bookings} bookings · {agent.group.pax} pax
                    </span>
                    <span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Umrah Package</span>{" "}
                      {agent.umrah.bookings} bookings · {agent.umrah.pax} pax
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
