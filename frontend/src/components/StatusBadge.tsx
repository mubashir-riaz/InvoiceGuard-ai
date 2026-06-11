// Colour-coded badge for invoice status.
const statusColors: Record<string, string> = {
  uploaded: "bg-blue-100 text-blue-800",
  processing: "bg-yellow-100 text-yellow-800",
  extracted: "bg-green-100 text-green-800",
  audited: "bg-purple-100 text-purple-800",
  disputed: "bg-orange-100 text-orange-800",
  error: "bg-red-100 text-red-800",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}
  >
    {status}
  </span>
);

export default StatusBadge;
