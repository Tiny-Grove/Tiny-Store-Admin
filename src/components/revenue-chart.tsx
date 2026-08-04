"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import type { MonthlyRevenue } from "@/lib/revenue";

const HEIGHT = 260;
const PADDING = { top: 28, right: 12, bottom: 32, left: 46 };
const MAX_BAR_WIDTH = 24;
const BAR_GAP = 4;

const ACCENT = "#437023"; // current month — brand-700, this app's brand accent
const MUTED = "#e2e8f0"; // past months — de-emphasis gray (slate-200)
const GRID = "#e1e0d9";
const AXIS_TEXT = "#898781";

function niceMax(value: number) {
  if (value <= 0) return 100;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

// Rounded top corners, square baseline — the mark spec for bars/columns.
function topRoundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  if (height <= 0 || width <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height}
    L${x},${y + r}
    Q${x},${y} ${x + r},${y}
    L${x + width - r},${y}
    Q${x + width},${y} ${x + width},${y + r}
    L${x + width},${y + height}
    Z`;
}

export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const currentIndex = data.length - 1;
  const maxAmount = Math.max(0, ...data.map((d) => d.amountCents));
  const axisMax = niceMax(maxAmount);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => axisMax * f);

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(slotWidth - BAR_GAP, 2));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Monthly revenue — last {data.length} months
        </p>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div className="animate-fade-in overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr
                  key={d.key}
                  className="border-t border-slate-100 transition-colors duration-150 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-700">
                    {d.label}
                    {i === currentIndex && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                        Current
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatMoney(d.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={containerRef} className="relative" style={{ height: HEIGHT }}>
          {width > 0 && (
            <svg width={width} height={HEIGHT} className="overflow-visible">
              {ticks.map((t, i) => {
                const y = PADDING.top + plotHeight - (t / axisMax) * plotHeight;
                return (
                  <g key={i}>
                    <line
                      x1={PADDING.left}
                      x2={width - PADDING.right}
                      y1={y}
                      y2={y}
                      stroke={GRID}
                      strokeWidth={1}
                    />
                    <text x={0} y={y + 3} fontSize={10} fill={AXIS_TEXT}>
                      {formatMoneyCompact(t)}
                    </text>
                  </g>
                );
              })}

              {data.map((d, i) => {
                const slotX = PADDING.left + i * slotWidth;
                const barX = slotX + (slotWidth - barWidth) / 2;
                const barHeight = Math.max((d.amountCents / axisMax) * plotHeight, d.amountCents > 0 ? 2 : 0);
                const barY = PADDING.top + plotHeight - barHeight;
                const isCurrent = i === currentIndex;
                const isHovered = hovered === i;

                return (
                  <g key={d.key}>
                    <path
                      d={topRoundedRectPath(barX, barY, barWidth, barHeight, 4)}
                      fill={isCurrent ? ACCENT : MUTED}
                      opacity={isHovered ? 0.8 : 1}
                      style={{ transition: "opacity 150ms" }}
                    />
                    {isCurrent && (
                      <text
                        x={barX + barWidth / 2}
                        y={barY - 8}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={600}
                        fill="#0f172a"
                      >
                        {formatMoneyCompact(d.amountCents)}
                      </text>
                    )}
                    <text
                      x={slotX + slotWidth / 2}
                      y={HEIGHT - 10}
                      textAnchor="middle"
                      fontSize={10}
                      fill={AXIS_TEXT}
                    >
                      {d.label}
                    </text>

                    {/* Hit target — bigger than the bar, carries the tooltip */}
                    <rect
                      x={slotX}
                      y={PADDING.top}
                      width={slotWidth}
                      height={plotHeight}
                      fill="transparent"
                      tabIndex={0}
                      role="img"
                      aria-label={`${d.label}: ${formatMoney(d.amountCents)}`}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered((h) => (h === i ? null : h))}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {hovered !== null && data[hovered] && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
              style={{
                left: PADDING.left + hovered * slotWidth + slotWidth / 2,
                top: Math.max(
                  PADDING.top +
                    plotHeight -
                    (data[hovered].amountCents / axisMax) * plotHeight -
                    56,
                  0
                ),
              }}
            >
              <p className="font-semibold text-slate-900">
                {formatMoney(data[hovered].amountCents)}
              </p>
              <p className="text-slate-500">{data[hovered].label}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
