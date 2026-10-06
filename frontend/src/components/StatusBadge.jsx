export default function StatusBadge({ status }) {
  const colorMap = {
    open: "bg-blue-100 text-blue-800",
    assigned: "bg-yellow-100 text-yellow-800",
    submitted: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    expired: "bg-gray-200 text-gray-700",
  };

  const label = {
    open: "Open",
    assigned: "Assigned",
    submitted: "Awaiting review",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${
        colorMap[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {label[status] || "Unknown"}
    </span>
  );
}
