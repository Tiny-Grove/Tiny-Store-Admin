"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; icon: ReactNode };

const overviewIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
    <path
      d="M3 10.5 10 4l7 6.5M5 9v6.5a1 1 0 0 0 1 1h3v-4h2v4h3a1 1 0 0 0 1-1V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const customersIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
    <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M4 17c0-3.31 2.69-5.5 6-5.5s6 2.19 6 5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const subscriptionsIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
    <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 8.5h14" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const financeIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
    <path
      d="M4 15.5v-4M8 15.5V8M12 15.5v-6M16 15.5V4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const supportIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
    <path d="M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M7.7 7.6a2.3 2.3 0 0 1 4.47.85c0 1.5-2.17 1.5-2.17 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="10" cy="14" r="0.9" fill="currentColor" />
  </svg>
);

const emailsIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
    <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="m3.5 5.5 6.5 5 6.5-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const settingsIcon = (
  <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
    <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10 3.5v1.6M10 14.9v1.6M16.5 10h-1.6M5.1 10H3.5M14.6 5.4l-1.13 1.13M6.53 13.47 5.4 14.6M14.6 14.6l-1.13-1.13M6.53 6.53 5.4 5.4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Grouped by workflow, not alphabetically — admins reach for "who's the
// customer / are they paying" together, then support/comms, then config.
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: overviewIcon }],
  },
  {
    label: "Sales",
    items: [
      { href: "/customers", label: "Customers", icon: customersIcon },
      { href: "/subscriptions", label: "Subscriptions", icon: subscriptionsIcon },
      { href: "/finance", label: "Finance", icon: financeIcon },
    ],
  },
  {
    label: "Engagement",
    items: [
      { href: "/support", label: "Support", icon: supportIcon },
      { href: "/emails", label: "Emails", icon: emailsIcon },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/settings", label: "Settings", icon: settingsIcon }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 p-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-brand-700 text-white shadow-md shadow-brand-700/25"
                      : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`transition-transform duration-200 ${
                      active ? "" : "group-hover:scale-110"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
