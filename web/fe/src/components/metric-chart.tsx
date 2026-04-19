"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

export function MetricChart({
  title,
  data,
  dataKey,
  stroke,
  gradientId,
  className = "",
  chartHeight = 260
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  stroke: string;
  gradientId: string;
  className?: string;
  chartHeight?: number | string;
}) {
  return (
    <div className={`min-w-0 rounded-[2rem] bg-white p-8 shadow-sm h-full ${className}`}>
      <div className="dashboard-widget-handle mb-6 cursor-move">
        <h3 className="text-xl font-black text-slate-900">{title}</h3>
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="95%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
