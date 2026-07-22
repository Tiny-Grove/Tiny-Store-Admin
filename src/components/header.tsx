import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { PageTitle } from "./page-title";
import { signOutAction } from "@/app/(app)/actions";

function initials(value: string) {
  return value.slice(0, 2).toUpperCase();
}

export function Header({ user }: { user: User | null }) {
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-sm">
      <PageTitle />

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-500 sm:inline">
          {user?.email}
        </span>

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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-700 text-xs font-semibold text-white">
            {initials(name ?? "?")}
          </div>
        )}

        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
