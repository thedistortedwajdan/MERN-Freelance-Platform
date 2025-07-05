export default function StatusBadge({ status }) {
  const colorMap = {
    open: "bg-blue-100 text-blue-800",
    assigned: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
  };

  const label = {
    open: "Open",
    assigned: "Assigned",
    completed: "Completed",
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
