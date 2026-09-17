import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useInvoice,
  useLineItems,
  useDiscrepancies,
  useDisputes,
  useGenerateDispute,
  useUpdateDispute,
  useSendDispute,
  useProcessInvoice,
  useAuditInvoice,
  useDeleteInvoice,
  getInvoicePdfUrl,
} from "../hooks/useApi";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";
import DataTable from "../components/DataTable";
import PdfViewer from "../components/PdfViewer";
import ConfirmDialog from "../components/ConfirmDialog";
import useConfirm from "../hooks/useConfirm";
import { 
  ArrowLeft, 
  FileText, 
  AlertTriangle, 
  Mail, 
  Send, 
  Edit2, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck,
  DollarSign, 
  CheckCircle2, 
  FileSpreadsheet,
  X,
  Check,
  RefreshCw,
  Trash2,
  Download,
  Columns,
  Layout,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);
  const navigate = useNavigate();

  const generate = useGenerateDispute();
  const updateDispute = useUpdateDispute();
  const sendDispute = useSendDispute();
  const process = useProcessInvoice();
  const audit = useAuditInvoice();
  const deleteInvoice = useDeleteInvoice();
  const { confirm, dialogProps } = useConfirm();

  // View mode state: split (side-by-side), data (data only), pdf (full pdf)
  const [viewMode, setViewMode] = useState<"split" | "data" | "pdf">("split");
  const [isMobilePdfOpen, setIsMobilePdfOpen] = useState(true);

  const { data: invoice, isLoading: isInvoiceLoading } = useInvoice(invoiceId);
  const invoiceStatus = invoice?.status?.toLowerCase();
  const isProcessing = invoiceStatus === "processing";

  const { data: lineItems } = useLineItems(invoiceId, {
    refetchInterval: isProcessing ? 2000 : false,
  });
  const { data: discrepancies } = useDiscrepancies(invoiceId, {
    refetchInterval: isProcessing ? 2000 : false,
  });
  const { data: disputes } = useDisputes(invoiceId, {
    refetchInterval: (query: any) => {
      const list = query.state.data || [];
      return (generate.isSuccess && list.length === 0) ? 2000 : false;
    }
  });

  // Inline email editor state
  const [editingDisputeId, setEditingDisputeId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const response = await api.get(`/invoices/${invoiceId}/export`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_invoice_${invoice?.invoice_number || invoiceId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      alert("Failed to export audit report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditClick = (dispute: any) => {
    setEditingDisputeId(dispute.id);
    setEditBody(dispute.draft_body);
  };

  const handleSaveDispute = (disputeId: number) => {
    updateDispute.mutate(
      { id: disputeId, draft_body: editBody },
      {
        onSuccess: () => setEditingDisputeId(null)
      }
    );
  };

  const lineColumns = [
    { 
      header: "Tracking #", 
      accessor: (row: any) => (
        <span className="font-mono text-xs font-semibold text-slate-700">{row.tracking_number}</span>
      )
    },
    { 
      header: "Description", 
      accessor: "description" as const 
    },
    { 
      header: "Weight (kg)", 
      accessor: (row: any) => (
        <span className="font-medium text-slate-600">{row.weight_kg} kg</span>
      )
    },
    { 
      header: "Charged", 
      accessor: (row: any) => (
        <span className="font-bold text-slate-800">${Number(row.charged_amount).toFixed(2)}</span>
      ) 
    },
  ];

  const discColumns = [
    { 
      header: "Expected", 
      accessor: (row: any) => (
        <span className="font-bold text-slate-600">${Number(row.expected_amount).toFixed(2)}</span>
      ) 
    },
    { 
      header: "Charged", 
      accessor: (row: any) => (
        <span className="font-bold text-slate-800">${Number(row.charged_amount).toFixed(2)}</span>
      ) 
    },
    {
      header: "Difference",
      accessor: (row: any) => {
        const diff = Number(row.difference);
        const isOver = diff > 0;
        return (
          <span className={`font-extrabold ${isOver ? "text-rose-600" : "text-amber-600"}`}>
            {isOver ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}
          </span>
        );
      },
    },
    { 
      header: "Reason", 
      accessor: (row: any) => (
        <span className={`text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${
          row.reason === "Overcharge" 
            ? "bg-rose-50 text-rose-700 border border-rose-200/60" 
            : "bg-amber-50 text-amber-700 border border-amber-200/60"
        }`}>
          {row.reason}
        </span>
      ) 
    },
  ];

  if (isInvoiceLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading invoice details...</p>
      </div>
    );
  }

  // Calculate discrepancy stats
  const hasDiscrepancies = Boolean(discrepancies && discrepancies.length > 0);
  const totalOverchargeAmount = discrepancies?.reduce((sum: number, d: any) => sum + (Number(d.difference) > 0 ? Number(d.difference) : 0), 0) || 0;
  const totalDiscrepancyAmount = discrepancies?.reduce((sum: number, d: any) => sum + Math.abs(Number(d.difference || 0)), 0) || 0;

  const renderOverviewCard = () => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Carrier freight bill</span>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
            Invoice {invoice?.invoice_number}
          </h2>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400 block">TOTAL CHARGED</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-1 block">${Number(invoice?.total_amount || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-50 text-sm">
        <div>
          <span className="text-slate-400 text-xs font-semibold block">Carrier</span>
          <span className="font-bold text-slate-700 mt-0.5 block">{invoice?.carrier}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs font-semibold block">Invoice Date</span>
          <span className="font-bold text-slate-700 mt-0.5 block">{invoice?.invoice_date}</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs font-semibold block">Billing Account</span>
          <span className="font-bold text-slate-700 mt-0.5 block">Client ID #{invoice?.client_id}</span>
        </div>
      </div>

      {/* Action Banner inside Overview */}
      {(invoiceStatus === "uploaded" || 
        invoiceStatus === "extracted" || 
        invoiceStatus === "processing" || 
        ((invoiceStatus === "error" || invoiceStatus === "audited") && (!lineItems || lineItems.length === 0))) && (
        <div className="flex items-center justify-between mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            <div>
              <h4 className="text-xs font-extrabold text-slate-800">
                {invoiceStatus === "uploaded" && "AI Extraction Pending"}
                {invoiceStatus === "extracted" && (lineItems && lineItems.length > 0 ? "AI Audit Pending" : "AI Extraction Required")}
                {invoiceStatus === "audited" && (!lineItems || lineItems.length === 0) && "AI Extraction Required"}
                {invoiceStatus === "error" && "AI Extraction Failed"}
                {invoiceStatus === "processing" && (
                  lineItems && lineItems.length > 0 ? "AI Audit In Progress..." : "AI Extraction In Progress..."
                )}
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                {invoiceStatus === "uploaded" && "Run AI extraction to retrieve line items and details."}
                {invoiceStatus === "extracted" && (lineItems && lineItems.length > 0 ? "Audit this invoice's rates against contracted tariffs." : "No line items extracted. Re-run AI extraction.")}
                {invoiceStatus === "audited" && (!lineItems || lineItems.length === 0) && "No line items extracted. Re-run AI extraction."}
                {invoiceStatus === "error" && "Something went wrong. Please check details or retry."}
                {invoiceStatus === "processing" && (
                  lineItems && lineItems.length > 0
                    ? "AI is auditing the extracted rates against carrier contract terms."
                    : "AI is extracting line items and details from the invoice."
                )}
              </p>
            </div>
          </div>
          
          {(invoiceStatus === "uploaded" || ((invoiceStatus === "extracted" || invoiceStatus === "error" || invoiceStatus === "audited") && (!lineItems || lineItems.length === 0))) && (
            <button
              onClick={() => process.mutate(invoiceId)}
              disabled={process.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all disabled:opacity-50 shadow-sm"
            >
              {process.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{invoiceStatus === "uploaded" ? "Run Extract AI" : "Re-run Extract AI"}</span>
            </button>
          )}
          {invoiceStatus === "extracted" && lineItems && lineItems.length > 0 && (
            <button
              onClick={() => audit.mutate(invoiceId)}
              disabled={audit.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all disabled:opacity-50 shadow-sm"
            >
              {audit.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Run Audit Rates</span>
            </button>
          )}
          {invoiceStatus === "processing" && (
            <div className="flex items-center gap-1.5 px-4 py-2 text-slate-500 font-extrabold text-xs bg-white border border-slate-100 rounded-lg shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>Processing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderLineItems = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-slate-400" />
          <span>Extracted Line Items ({lineItems?.length || 0})</span>
        </h3>
        {lineItems && lineItems.length > 0 && (
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 font-bold text-xs transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export Audit CSV</span>
          </button>
        )}
      </div>

      {invoiceStatus === "uploaded" ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h4 className="text-sm font-bold text-slate-800">AI Extraction Required</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold font-sans">
              This invoice's line items are currently locked inside the PDF. Run AI Extraction to automatically retrieve details like:
            </p>
            <ul className="text-[11px] text-slate-600 font-semibold grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 max-w-xs mx-auto text-left list-disc list-inside bg-white/60 p-3 rounded-xl border border-slate-100">
              <li>Tracking Numbers</li>
              <li>Charged Amounts</li>
              <li>Item Descriptions</li>
              <li>Shipment Weights</li>
            </ul>
          </div>
          <button
            onClick={() => process.mutate(invoiceId)}
            disabled={process.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm disabled:opacity-50"
          >
            {process.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Run Extract AI</span>
          </button>
        </div>
      ) : invoiceStatus === "processing" && (!lineItems || lineItems.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Extracting Line Items...</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              AI is parsing the invoice PDF and extracting shipment tracking numbers, descriptions, weights, and charged rates.
            </p>
          </div>
          <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      ) : (invoiceStatus === "error" || ((invoiceStatus === "extracted" || invoiceStatus === "audited") && (!lineItems || lineItems.length === 0))) ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/20 rounded-2xl border border-dashed border-rose-200/80 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-rose-800">
              {invoiceStatus === "error" ? "Extraction Failed" : "No Line Items Extracted"}
            </h4>
            <p className="text-xs text-rose-500 leading-relaxed font-semibold font-sans">
              {invoiceStatus === "error" 
                ? "An error occurred during AI extraction. Please verify the PDF file content or retry the extraction."
                : "AI completed the task but was unable to find or extract any line items from this invoice. You can retry the extraction using the header or banner action."
              }
            </p>
          </div>
        </div>
      ) : (
        <DataTable 
          columns={lineColumns} 
          data={lineItems || []} 
          emptyMessage="No line items could be extracted from this invoice PDF."
        />
      )}
    </div>
  );

  const renderAuditAndDisputes = () => (
    <div className="space-y-6">
      {/* AI Auditor Summary Block */}
      {invoiceStatus === "audited" || invoiceStatus === "disputed" ? (
        <div className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
          hasDiscrepancies 
            ? "bg-rose-50/30 border-rose-100 text-rose-900" 
            : "bg-emerald-50/20 border-emerald-100 text-emerald-900"
        }`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
              {hasDiscrepancies ? (
                <>
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  <span>Audit: Discrepancy Found</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Audit: Rates Verified</span>
                </>
              )}
            </h3>
          </div>

          {hasDiscrepancies ? (
            <>
              <p className="text-sm leading-relaxed">
                AI audited this invoice against the carrier contract terms and detected rate differences ({discrepancies?.length} flag{discrepancies?.length === 1 ? "" : "s"}).
              </p>
              <div className="bg-white/80 backdrop-blur border border-rose-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 block uppercase tracking-wider">
                    {totalOverchargeAmount > 0 ? "Claimable Overcharge" : "Total Flagged Difference"}
                  </span>
                  <span className="text-xl font-extrabold text-rose-700 mt-0.5 block">
                    ${(totalOverchargeAmount > 0 ? totalOverchargeAmount : totalDiscrepancyAmount).toFixed(2)}
                  </span>
                </div>
                <div className="px-3 py-1 bg-rose-500 text-white font-bold text-xs rounded-lg">
                  {totalOverchargeAmount > 0 ? "CLAIMABLE" : "FLAGGED"}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed">
              Excellent! The charges match client contract rate tariffs. No differences were flagged.
            </p>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-slate-200/60 bg-slate-50/50 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 text-slate-500">
              <ShieldAlert className="w-5 h-5 text-slate-400" />
              <span>Audit Status</span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            {invoiceStatus === "uploaded" 
              ? "This invoice is uploaded but the line items have not been extracted yet. Run 'Extract AI' to begin." 
              : invoiceStatus === "processing"
                ? (lineItems && lineItems.length > 0 ? "AI is auditing the charges..." : "AI is extracting line items...")
                : "Line items have been extracted. Click 'Run Audit Rates' to audit the charges against the client contract terms."}
          </p>
        </div>
      )}

      {/* Discrepancy Details List */}
      {discrepancies && discrepancies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Audit Flags</span>
          </h3>
          <DataTable columns={discColumns} data={discrepancies} />
        </div>
      )}

      {/* Dispute Generation & Email Block */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
          <Mail className="w-5 h-5 text-slate-400" />
          <span>Carrier Dispute Drafts</span>
        </h3>

        {disputes && disputes.length > 0 ? (
          disputes.map((d: any) => {
            const isEditing = editingDisputeId === d.id;

            return (
              <div key={d.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      d.status === "DRAFT" 
                        ? "bg-slate-100 text-slate-700" 
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  {d.status === "DRAFT" && !isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(d)}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Draft</span>
                      </button>
                      
                      <button
                        onClick={() => sendDispute.mutate(d.id)}
                        disabled={sendDispute.isPending}
                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{sendDispute.isPending ? "Sending..." : "Send Claim"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3 border-t border-slate-50 pt-3">
                    <div className="text-xs bg-slate-50 border p-2 rounded-lg text-slate-500 font-semibold space-y-1">
                      <p><span className="text-slate-400">To:</span> billing-disputes@{invoice?.carrier?.toLowerCase().replace(/\s/g, "") || "carrier"}.com</p>
                      <p><span className="text-slate-400">Subject:</span> Rate Discrepancy Dispute: Invoice #{invoice?.invoice_number}</p>
                    </div>
                    
                    <textarea
                      className="w-full min-h-[160px] text-xs font-mono border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-3 rounded-xl outline-none"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditingDisputeId(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveDispute(d.id)}
                        disabled={updateDispute.isPending}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
                      >
                        {updateDispute.isPending ? "Saving..." : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Draft</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3.5 max-h-[180px] overflow-y-auto border border-slate-100">
                    <pre className="whitespace-pre-wrap text-[11px] leading-relaxed font-mono text-slate-600">
                      {d.draft_body}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
            <Mail className="w-6 h-6 mx-auto text-slate-400" />
            <p className="text-xs text-slate-400 font-bold mt-1.5">No disputes generated yet.</p>
          </div>
        )}

        {/* Generate Dispute Trigger */}
        {invoiceStatus === "audited" && discrepancies && discrepancies.length > 0 && disputes?.length === 0 && (
          <button
            onClick={() => generate.mutate(invoiceId)}
            disabled={generate.isPending}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generate.isPending ? "Generating Draft..." : "Generate Dispute Email"}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </button>

          {/* View Mode Controls */}
          {invoice && (
            <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "split"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Side-by-side comparison: PDF on left, data on right"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("data")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "data"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Extracted line items and audit data only"
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Data Only</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pdf")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "pdf"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Full-page original PDF preview"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Only</span>
              </button>
            </div>
          )}
        </div>

        {invoice && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Open in New Tab Button */}
            <a
              href={getInvoicePdfUrl(invoiceId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 font-bold text-xs transition-all shadow-2xs"
              title="Open raw PDF document in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open PDF</span>
            </a>

            {(invoiceStatus === "uploaded" || 
              ((invoiceStatus === "extracted" || invoiceStatus === "error" || invoiceStatus === "audited") && 
               (!lineItems || lineItems.length === 0))) && (
              <button
                onClick={() => process.mutate(invoiceId)}
                disabled={process.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition-all disabled:opacity-50"
              >
                {process.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{invoiceStatus === "uploaded" ? "Extract AI" : "Re-run Extract AI"}</span>
              </button>
            )}

            {invoiceStatus === "extracted" && lineItems && lineItems.length > 0 && (
              <button
                onClick={() => audit.mutate(invoiceId)}
                disabled={audit.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold text-xs transition-all disabled:opacity-50"
              >
                {audit.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>Audit rates</span>
              </button>
            )}

            <button
              onClick={async () => {
                const ok = await confirm({
                  title: "Delete Invoice",
                  message: `Are you sure you want to delete invoice #${invoice.invoice_number}? All extracted line items, discrepancies, and dispute drafts will be permanently removed. This action cannot be undone.`,
                  confirmText: "Delete Invoice",
                  isDestructive: true,
                });
                if (ok) {
                  deleteInvoice.mutate(invoiceId, {
                    onSuccess: () => {
                      navigate("/");
                    },
                  });
                }
              }}
              disabled={deleteInvoice.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all disabled:opacity-50"
              title="Delete Invoice"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            {invoiceStatus !== "uploaded" && invoiceStatus !== "processing" && (
              <button
                onClick={handleExportCsv}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 font-bold text-xs transition-all disabled:opacity-50"
                title="Export Audit Report as CSV"
              >
                {isExporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export CSV</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">CURRENT STATUS:</span>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        )}
      </div>

      {invoice && (
        <>
          {/* View 1: PDF Only */}
          {viewMode === "pdf" && (
            <div className="space-y-4">
              <PdfViewer 
                invoiceId={invoiceId} 
                invoiceNumber={invoice.invoice_number} 
                className="h-[calc(100vh-180px)] min-h-[750px]" 
              />
            </div>
          )}

          {/* View 2: Split View (Side-by-side original PDF and extracted data) */}
          {viewMode === "split" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left Column: Original PDF Document (Sticky on desktop, collapsible on mobile) */}
              <div className="xl:col-span-6 space-y-2">
                <div className="xl:hidden flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Original Invoice PDF
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobilePdfOpen(!isMobilePdfOpen)}
                    className="text-xs font-bold text-indigo-600 flex items-center gap-1"
                  >
                    <span>{isMobilePdfOpen ? "Hide PDF" : "Show PDF"}</span>
                    {isMobilePdfOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <div className={`${isMobilePdfOpen ? "" : "hidden xl:block"} xl:sticky xl:top-6`}>
                  <PdfViewer 
                    invoiceId={invoiceId} 
                    invoiceNumber={invoice.invoice_number} 
                    className="h-[520px] sm:h-[600px] xl:h-[calc(100vh-140px)] min-h-[500px]"
                  />
                </div>
              </div>

              {/* Right Column: Extracted Data & Audits */}
              <div className="xl:col-span-6 space-y-6">
                {renderOverviewCard()}
                {renderLineItems()}
                {renderAuditAndDisputes()}
              </div>
            </div>
          )}

          {/* View 3: Data Only (Classic layout) */}
          {viewMode === "data" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info Columns */}
              <div className="lg:col-span-2 space-y-6">
                {renderOverviewCard()}
                {renderLineItems()}
              </div>

              {/* Sidebar / Audit Column */}
              <div>
                {renderAuditAndDisputes()}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

export default InvoiceDetail;

