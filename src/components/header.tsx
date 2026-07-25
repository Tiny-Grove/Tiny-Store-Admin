import type { User } from "@supabase/supabase-js";
import { PageTitle } from "./page-title";
import { UserMenu } from "./user-menu";

export function Header({ user }: { user: User | null }) {
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-sm">
      <PageTitle />

      <UserMenu email={user?.email} name={name} avatarUrl={avatarUrl} />
    </header>
  );
}
