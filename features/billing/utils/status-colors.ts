export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "trial":
      return "bg-blue-100 text-blue-800";
    case "canceled":
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "past_due":
      return "bg-yellow-100 text-yellow-800";
    case "incomplete":
      return "bg-orange-100 text-orange-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "paid":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
