// Lists all disputes across all invoices.
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import DataTable from "../components/DataTable";

const Disputes = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["allDisputes"],
    queryFn: () => api.get("/disputes/").then((r) => r.data),
  });

  const columns = [
    { header: "ID", accessor: "id" as const },
    { header: "Invoice ID", accessor: "invoice_id" as const },
    { header: "Carrier", accessor: "carrier" as const },
    { header: "Status", accessor: "status" as const },
    {
      header: "Preview",
      accessor: (row: any) => row.draft_body?.slice(0, 100) + "...",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">All Disputes</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}
    </div>
  );
};

export default Disputes;
