"use client";

import { useState, type ReactNode } from "react";

export interface CustomerTab {
  id: string;
  label: string;
  content: ReactNode;
}

export function CustomerTabs({ tabs }: { tabs: CustomerTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((tab) => {
          const isActive = tab.id === active?.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div key={active?.id} className="animate-fade-in-up">
        {active?.content}
      </div>
    </div>
  );
}
