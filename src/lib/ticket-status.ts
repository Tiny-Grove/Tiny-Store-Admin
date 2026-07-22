export function ticketStatusBadgeClasses(status: string) {
  switch (status) {
    case "open":
      return "bg-amber-50 text-amber-700";
    case "pending":
      return "bg-sky-50 text-sky-700";
    case "resolved":
      return "bg-green-50 text-green-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function ticketStatusDotClasses(status: string) {
  switch (status) {
    case "open":
      return "bg-amber-500";
    case "pending":
      return "bg-sky-500";
    case "resolved":
      return "bg-green-500";
    default:
      return "bg-slate-400";
  }
}
