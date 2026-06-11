// Main dashboard – lists invoices, allows upload, process, audit.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useInvoices,
  useClients,
  useProcessInvoice,
  useAuditInvoice,
} from "../hooks/useApi";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import FileUpload from "../components/FileUpload";

const Dashboard = () => {
  const { data: invoices, isLoading } = useInvoices();
  const { data: clients } = useClients();
  const navigate = useNavigate();
  const process = useProcessInvoice();
  const audit = useAuditInvoice();
  const [showUpload, setShowUpload] = useState(false);

  // For upload, we need a client and contract. We'll use the first client and its first contract (simplified)
  const clientId = clients?.[0]?.id || 1;
  const contractId = 1; // In a real app, you'd select

  const columns = [
    { header: "ID", accessor: "id" as const },
    { header: "Invoice #", accessor: "invoice_number" as const },
    { header: "Carrier", accessor: "carrier" as const },
    { header: "Date", accessor: (row: any) => row.invoice_date },
    { header: "Total", accessor: (row: any) => `$${row.total_amount}` },
    {
      header: "Status",
      accessor: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessor: (row: any) => (
        <div className="flex gap-2">
          {row.status === "uploaded" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                process.mutate(row.id);
              }}
              className="text-blue-600 text-xs"
            >
              Extract
            </button>
          )}
          {row.status === "extracted" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                audit.mutate(row.id);
              }}
              className="text-purple-600 text-xs"
            >
              Audit
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Invoices</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {showUpload ? "Cancel" : "+ Upload"}
        </button>
      </div>

      {showUpload && (
        <div className="mb-6">
          <FileUpload clientId={clientId} contractId={contractId} />
        </div>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={invoices || []}
          onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        />
      )}
    </div>
  );
};

export default Dashboard;
