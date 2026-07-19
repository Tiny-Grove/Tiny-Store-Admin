import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailTemplate } from "@/lib/supabase/types";
import { SendForm } from "./send-form";

export const maxDuration = 60;

export default async function SendTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const admin = createAdminClient();
  const { data: template } = await admin
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!template) notFound();
  const t = template as EmailTemplate;

  return (
    <div className="max-w-xl space-y-6">
      <Link
        href={`/emails/${t.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M12.5 15 7.5 10l5-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t.name}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Send &quot;{t.name}&quot;
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t.subject}</p>
      </div>

      <SendForm templateId={t.id} />
    </div>
  );
}
