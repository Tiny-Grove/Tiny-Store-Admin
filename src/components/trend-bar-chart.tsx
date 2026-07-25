"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoneyCompact } from "@/lib/format";

const HEIGHT = 220;
const PADDING = { top: 24, right: 8, bottom: 28, left: 40 };
const MAX_BAR_WIDTH = 22;
const BAR_GAP = 4;

const MUTED = "#e2e8f0"; // slate-200
const GRID = "#e1e0d9";
const AXIS_TEXT = "#898781";

function niceMax(value: number) {
  if (value <= 0) return 5;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

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

export function TrendBarChart({
  data,
  color = "#437023",
  format = "count",
}: {
  data: { key: string; label: string; value: number }[];
  color?: string;
  format?: "count" | "money";
}) {
  const formatValue = format === "money" ? formatMoneyCompact : (v: number) => String(v);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

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
  const maxValue = Math.max(0, ...data.map((d) => d.value));
  const axisMax = niceMax(maxValue);
  const ticks = [0, 0.5, 1].map((f) => axisMax * f);

  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 0);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const slotWidth = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(slotWidth - BAR_GAP, 2));
  // Skip month labels when there isn't room for them side by side (e.g. 12
  // months in a half-width card) — always keep the last (current) one.
  const labelStep = slotWidth > 0 ? Math.max(1, Math.ceil(34 / slotWidth)) : 1;

  return (
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
                  {formatValue(Math.round(t))}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const slotX = PADDING.left + i * slotWidth;
            const barX = slotX + (slotWidth - barWidth) / 2;
            const barHeight = Math.max((d.value / axisMax) * plotHeight, d.value > 0 ? 2 : 0);
            const barY = PADDING.top + plotHeight - barHeight;
            const isCurrent = i === currentIndex;
            const isHovered = hovered === i;

            return (
              <g key={d.key}>
                <path
                  d={topRoundedRectPath(barX, barY, barWidth, barHeight, 4)}
                  fill={isCurrent ? color : MUTED}
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
                    {formatValue(d.value)}
                  </text>
                )}
                {(i === currentIndex ||
                  (i % labelStep === 0 && currentIndex - i >= labelStep)) && (
                  <text
                    x={slotX + slotWidth / 2}
                    y={HEIGHT - 10}
                    textAnchor="middle"
                    fontSize={10}
                    fill={AXIS_TEXT}
                  >
                    {d.label}
                  </text>
                )}

                <rect
                  x={slotX}
                  y={PADDING.top}
                  width={slotWidth}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label}: ${formatValue(d.value)}`}
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
              PADDING.top + plotHeight - (data[hovered].value / axisMax) * plotHeight - 44,
              0
            ),
          }}
        >
          <p className="font-semibold text-slate-900">{formatValue(data[hovered].value)}</p>
          <p className="text-slate-500">{data[hovered].label}</p>
        </div>
      )}
    </div>
  );
}
