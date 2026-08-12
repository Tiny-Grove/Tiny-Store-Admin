"use client";

import { usePathname } from "next/navigation";
import { isActive, NAV_ITEMS } from "./sidebar";

export function PageTitle() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <span className="font-medium text-slate-900">
      {current?.label ?? "Bizzlet Admin"}
    </span>
  );
}
