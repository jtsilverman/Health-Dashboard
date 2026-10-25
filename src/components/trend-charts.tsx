"use client";

import { useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { TARGETS } from "@/lib/targets";
import { cn } from "@/lib/utils";

export type ChartPoint = {
  date: string;
  label: string;
  recovery: number | null;
  hrv: number | null;
  sleep: number | null;
  sleepPerf: number | null;
  strain: number | null;
  burn: number | null;
  intake: number | null;
  protein: number | null;
};

const tooltipStyle = {
  background: "#171910",
  border: "1px solid #313628",
  borderRadius: 12,
  fontSize: 12,
};

function has(points: ChartPoint[], key: keyof ChartPoint) {
  return points.some((point) => typeof point[key] === "number");
}

function ChartFrame({
  title,
  note,
  children,
  empty,
}: {
  title: string;
  note: string;
  children: ReactNode;
  empty: boolean;
}) {
  return (
    <Card className="px-3 py-4 sm:px-5">
      <div className="mb-3 px-1">
        <h3 className="font-display text-2xl tracking-wide">{title}</h3>
        <p className="text-xs text-muted">{note}</p>
      </div>
      {empty ? (
        <p className="px-1 py-10 text-sm text-muted">Nothing in this window yet.</p>
      ) : (
        <div className="h-56 w-full">{children}</div>
      )}
    </Card>
  );
}

export function TrendCharts({ points }: { points: ChartPoint[] }) {
  const [range, setRange] = useState<7 | 30>(7);
  const window = points.slice(-range);
  const axis = {
    stroke: "#8d917e",
    tick: { fill: "#a7aa96", fontSize: 11 },
    tickLine: false,
    axisLine: false,
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl tracking-wide">Trends</h2>
        <div className="flex rounded-full border border-border p-1">
          {[7, 30].map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={range === days}
              onClick={() => setRange(days as 7 | 30)}
              className={cn(
                "h-8 rounded-full px-3 text-xs uppercase tracking-[0.14em]",
                range === days ? "bg-accent text-accent-foreground" : "text-muted",
              )}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <ChartFrame title="Recovery and HRV" note="Green starts at 67%. HRV is on the right axis." empty={!has(window, "recovery") && !has(window, "hrv")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={window} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#2a2e22" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={range === 30 ? 4 : 0} />
            <YAxis yAxisId="left" {...axis} domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine yAxisId="left" y={67} stroke="#9be7a8" strokeDasharray="4 4" />
            <Line yAxisId="left" type="monotone" dataKey="recovery" name="Recovery %" stroke="#e2f06a" strokeWidth={2} dot={false} connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="hrv" name="HRV ms" stroke="#8eb6ff" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Sleep" note="Hours asleep, with sleep performance on the line." empty={!has(window, "sleep")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={window} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#2a2e22" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={range === 30 ? 4 : 0} />
            <YAxis yAxisId="left" {...axis} />
            <YAxis yAxisId="right" orientation="right" {...axis} domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar yAxisId="left" dataKey="sleep" name="Hours" fill="#e2f06a" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="sleepPerf" name="Performance %" stroke="#8eb6ff" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Strain and burn" note="WHOOP strain against Garmin total calories." empty={!has(window, "strain") && !has(window, "burn")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={window} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#2a2e22" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={range === 30 ? 4 : 0} />
            <YAxis yAxisId="left" {...axis} domain={[0, 21]} />
            <YAxis yAxisId="right" orientation="right" {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar yAxisId="left" dataKey="strain" name="Strain" fill="#ffb15a" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="burn" name="Garmin kcal" stroke="#f4f1e6" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Calories in and out" note="MyFitnessPal intake against Garmin expenditure. Target is 2,850." empty={!has(window, "burn") && !has(window, "intake")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={window} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#2a2e22" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={range === 30 ? 4 : 0} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={TARGETS.kcal} stroke="#ff6b57" strokeDasharray="4 4" />
            <Bar dataKey="intake" name="Intake" fill="#8eb6ff" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="burn" name="Garmin kcal" stroke="#e2f06a" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Protein" note="Daily target is 200 g." empty={!has(window, "protein")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={window} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#2a2e22" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={range === 30 ? 4 : 0} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={TARGETS.proteinG} stroke="#ff6b57" strokeDasharray="4 4" />
            <Bar dataKey="protein" name="Protein g" fill="#e2f06a" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>
    </section>
  );
}
