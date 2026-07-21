import Link from "next/link";

export default async function StorefrontCancelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Checkout cancelled
        </h1>
        <p className="text-sm text-slate-500">
          No payment was taken. Your cart is still waiting for you.
        </p>
        <Link
          href={`/store/${slug}`}
          className="mt-2 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}
