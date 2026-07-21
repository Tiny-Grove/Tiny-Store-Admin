import Link from "next/link";

export default async function StorefrontSuccessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          ✓
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          Thank you for your order!
        </h1>
        <p className="text-sm text-slate-500">
          Your payment was successful. The seller will be in touch about
          delivery or collection.
        </p>
        <Link
          href={`/store/${slug}`}
          className="mt-2 inline-block rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}
