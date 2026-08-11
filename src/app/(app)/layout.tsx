import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Logo } from "@/components/logo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.email) {
    const { data: adminRow } = await createAdminClient()
      .from("admin_users")
      .select("role")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    isAdmin = adminRow?.role === "admin";
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-5">
          <Logo className="h-9 w-auto shrink-0" />
          <div className="leading-tight">
            <p className="text-base font-semibold text-slate-900">Tiny Store</p>
            <p className="text-xs font-medium text-slate-400">Admin</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar isAdmin={isAdmin} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="flex-1 px-8 py-8">
          <div className="animate-fade-in-up mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
