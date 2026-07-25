"use client";

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";
import { COUNTRIES, flagEmoji } from "@/lib/countries";

export interface CountryCount {
  code: string;
  name: string;
  count: number;
}

const WIDTH = 800;
const HEIGHT = 420;

const NUMERIC_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.numeric]));

// Interpolates from a neutral "no customers" gray to solid brand green as a
// country's share of the max count grows.
function colorForRatio(ratio: number) {
  const from = [226, 232, 240];
  const to = [87, 142, 48];
  const [r, g, b] = from.map((f, i) => Math.round(f + (to[i] - f) * ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

export function WorldMapCard({ counts }: { counts: CountryCount[] }) {
  const countByNumeric = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of counts) {
      const numeric = NUMERIC_BY_CODE.get(c.code);
      if (numeric) map.set(numeric, c.count);
    }
    return map;
  }, [counts]);

  const maxCount = Math.max(1, ...counts.map((c) => c.count));

  const { features, pathFor } = useMemo(() => {
    const topology = worldData as unknown as Topology<{
      countries: GeometryCollection<{ name: string }>;
    }>;
    const collection = feature(topology, topology.objects.countries);
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], collection);
    const pathGenerator = geoPath(projection);

    return {
      features: collection.features,
      pathFor: (f: (typeof collection.features)[number]) => pathGenerator(f) ?? "",
    };
  }, []);

  const topCountries = [...counts].sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="animate-fade-in-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-medium text-slate-900">Customers by country</h2>
      <p className="mb-4 text-sm text-slate-500">
        Where your customers registered from.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
            {features.map((f, i) => {
              const id = String(f.id);
              const count = countByNumeric.get(id) ?? 0;
              const fill =
                count > 0
                  ? colorForRatio(0.3 + 0.7 * (count / maxCount))
                  : "#e2e8f0";
              return (
                <path
                  key={i}
                  d={pathFor(f)}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.5}
                  className="transition-colors duration-300"
                >
                  <title>
                    {`${f.properties?.name ?? "Unknown"}${
                      count ? ` — ${count} customer${count === 1 ? "" : "s"}` : ""
                    }`}
                  </title>
                </path>
              );
            })}
          </svg>
        </div>

        <div className="space-y-1">
          {topCountries.length === 0 ? (
            <p className="text-sm text-slate-500">
              No customer locations recorded yet.
            </p>
          ) : (
            topCountries.map((c) => (
              <div
                key={c.code}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg leading-none">
                    {flagEmoji(c.code)}
                  </span>
                  <span className="text-slate-700">{c.name}</span>
                </span>
                <span className="font-medium text-slate-900">{c.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
