"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { signOutAction } from "@/app/(app)/actions";

function initials(value: string) {
  return value.slice(0, 2).toUpperCase();
}

export function UserMenu({
  email,
  name,
  avatarUrl,
}: {
  email: string | undefined;
  name: string | undefined;
  avatarUrl: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
      >
        <span className="hidden text-sm text-slate-500 sm:inline">{email}</span>

        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className="rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
            {initials(name ?? "?")}
          </div>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="truncate border-b border-slate-100 px-3 py-2 text-sm text-slate-500 sm:hidden">
            {email}
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
