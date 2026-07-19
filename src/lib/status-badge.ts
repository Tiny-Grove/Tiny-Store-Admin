export function statusBadgeClasses(status: string) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700";
    case "past_due":
      return "bg-red-50 text-red-700";
    case "canceled":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export function statusDotClasses(status: string) {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "past_due":
      return "bg-red-500";
    case "canceled":
      return "bg-slate-400";
    default:
      return "bg-amber-500";
  }
}
