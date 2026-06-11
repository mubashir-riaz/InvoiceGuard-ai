// Detail page for a single invoice: line items, discrepancies, disputes.
import { useParams, useNavigate } from "react-router-dom";
import {
  useInvoice,
  useLineItems,
  useDiscrepancies,
  useDisputes,
  useGenerateDispute,
} from "../hooks/useApi";
import StatusBadge from "../components/StatusBadge";
import DataTable from "../components/DataTable";

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const { data: invoice } = useInvoice(invoiceId);
  const { data: lineItems } = useLineItems(invoiceId);
  const { data: discrepancies } = useDiscrepancies(invoiceId);
  const { data: disputes } = useDisputes(invoiceId);
  const generate = useGenerateDispute();
  const navigate = useNavigate();

  const lineColumns = [
    { header: "Tracking #", accessor: "tracking_number" as const },
    { header: "Description", accessor: "description" as const },
    { header: "Weight (kg)", accessor: (row: any) => row.weight_kg },
    { header: "Charged", accessor: (row: any) => `$${row.charged_amount}` },
  ];

  const discColumns = [
    { header: "Expected", accessor: (row: any) => `$${row.expected_amount}` },
    { header: "Charged", accessor: (row: any) => `$${row.charged_amount}` },
    {
      header: "Difference",
      accessor: (row: any) => (
        <span className="text-red-600">${row.difference}</span>
      ),
    },
    { header: "Reason", accessor: "reason" as const },
  ];

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="text-blue-600 mb-4 inline-block"
      >
        ← Back to Dashboard
      </button>
      {invoice && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Invoice {invoice.invoice_number}
          </h2>
          <p>
            Carrier: {invoice.carrier} | Date: {invoice.invoice_date} | Total: $
            {invoice.total_amount}
          </p>
          <StatusBadge status={invoice.status} />
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Extracted Line Items</h3>
        {lineItems?.length ? (
          <DataTable columns={lineColumns} data={lineItems} />
        ) : (
          <p>No line items extracted yet.</p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Discrepancies</h3>
        {discrepancies?.length ? (
          <DataTable columns={discColumns} data={discrepancies} />
        ) : (
          <p>No discrepancies found.</p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Disputes</h3>
        {disputes?.length ? (
          disputes.map((d: any) => (
            <div key={d.id} className="bg-white p-4 rounded shadow mb-2">
              <p className="text-sm text-gray-500">Status: {d.status}</p>
              <pre className="whitespace-pre-wrap text-sm mt-2 bg-gray-50 p-3 rounded">
                {d.draft_body}
              </pre>
            </div>
          ))
        ) : (
          <p>No disputes generated yet.</p>
        )}
        {invoice?.status === "audited" && (
          <button
            onClick={() => generate.mutate(invoiceId)}
            disabled={generate.isPending}
            className="bg-orange-500 text-white px-4 py-2 rounded mt-2"
          >
            {generate.isPending ? "Generating..." : "Generate Dispute"}
          </button>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetail;
