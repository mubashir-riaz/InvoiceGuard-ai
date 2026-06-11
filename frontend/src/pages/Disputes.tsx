import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { 
  useUpdateDispute, 
  useSendDispute 
} from "../hooks/useApi";
import DataTable from "../components/DataTable";
import { 
  Mail, 
  Send, 
  Edit2, 
  Search, 
  Filter, 
  X, 
  Eye, 
  Check, 
  AlertCircle,
  FileText
} from "lucide-react";

const Disputes = () => {
  const { data: disputes, isLoading, refetch } = useQuery({
    queryKey: ["allDisputes"],
    queryFn: () => api.get("/disputes/").then((r) => r.data),
  });

  const updateDispute = useUpdateDispute();
  const sendDispute = useSendDispute();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'draft', 'sent'

  // Selected dispute for modal detail view
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");

  const handleRowClick = (dispute: any) => {
    setSelectedDispute(dispute);
    setEditBody(dispute.draft_body);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!selectedDispute) return;
    updateDispute.mutate(
      { id: selectedDispute.id, draft_body: editBody },
      {
        onSuccess: (res: any) => {
          setIsEditing(false);
          // Update the local modal state
          setSelectedDispute((prev: any) => ({ ...prev, draft_body: editBody }));
          refetch();
        }
      }
    );
  };

  const handleSend = () => {
    if (!selectedDispute) return;
    sendDispute.mutate(selectedDispute.id, {
      onSuccess: () => {
        setSelectedDispute((prev: any) => ({ ...prev, status: "SENT" }));
        refetch();
      }
    });
  };

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    const list = disputes || [];
    return list.filter((d: any) => {
      const matchesSearch = 
        String(d.invoice_id).includes(searchQuery) ||
        d.carrier?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = 
        activeTab === "all" || 
        d.status?.toLowerCase() === activeTab.toLowerCase();

      return matchesSearch && matchesTab;
    });
  }, [disputes, searchQuery, activeTab]);

  const columns = [
    { 
      header: "Claim ID", 
      accessor: (row: any) => (
        <span className="font-bold text-slate-800">#CLAIM-{row.id}</span>
      )
    },
    { 
      header: "Invoice ID", 
      accessor: (row: any) => (
        <span className="font-semibold text-slate-500">Invoice #{row.invoice_id}</span>
      )
    },
    { 
      header: "Carrier", 
      accessor: (row: any) => (
        <span className="font-semibold text-slate-700">{row.carrier || "DHL Express"}</span>
      )
    },
    {
      header: "Status",
      accessor: (row: any) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          row.status === "SENT" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-100/50" 
            : "bg-slate-50 text-slate-600 border-slate-200/50"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${row.status === "SENT" ? "bg-emerald-500" : "bg-slate-400"}`} />
          <span>{row.status}</span>
        </span>
      ),
    },
    {
      header: "Preview",
      accessor: (row: any) => (
        <span className="text-slate-400 text-xs font-medium truncate block max-w-xs">
          {row.draft_body?.slice(0, 65)}...
        </span>
      ),
    },
    {
      header: "Action",
      accessor: (row: any) => (
        <button 
          onClick={() => handleRowClick(row)}
          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Review</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Claims Center</h2>
        <p className="text-sm text-slate-500 mt-1">Review AI-generated rate disputes, customize drafts, and submit claims to carriers.</p>
      </div>

      {/* Controls & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Claims
          </button>
          <button
            onClick={() => setActiveTab("draft")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "draft" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "sent" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Submitted
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by carrier or ID..."
            className="w-full bg-slate-50 border border-slate-200/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pl-10 pr-4 py-2 rounded-xl text-sm font-medium text-slate-700 outline-none transition-all placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Data */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500">Loading claims history...</p>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={filteredDisputes} 
          onRowClick={handleRowClick}
          emptyMessage="No dispute claims found in this category."
        />
      )}

      {/* Claim Detail Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden transform transition-all animate-scale-up">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedDispute(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">Dispute Claim Review</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedDispute.status === "SENT" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                }`}>
                  {selectedDispute.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                Claim #CLAIM-{selectedDispute.id}
              </h3>
            </div>

            {/* Metadata Section */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 border-t border-b border-slate-50 py-3.5">
              <div>
                <span className="text-slate-400 uppercase tracking-wider block">Carrier</span>
                <span className="text-slate-800 font-bold text-sm block mt-1">{selectedDispute.carrier || "DHL Express"}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block">Reference invoice</span>
                <a 
                  href={`/invoices/${selectedDispute.invoice_id}`}
                  className="text-indigo-600 hover:underline font-bold text-sm block mt-1"
                >
                  Invoice #{selectedDispute.invoice_id}
                </a>
              </div>
            </div>

            {/* Email draft body */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Dispute Email Copy</span>
              </span>

              {isEditing ? (
                <textarea
                  className="w-full min-h-[200px] text-xs font-mono border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 rounded-xl outline-none"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 max-h-[250px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed font-mono text-slate-600">
                    {selectedDispute.draft_body}
                  </pre>
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="flex justify-between items-center pt-2">
              <div>
                {selectedDispute.status === "DRAFT" && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>{isEditing ? "View Copy" : "Edit Draft"}</span>
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                
                {selectedDispute.status === "DRAFT" && (
                  isEditing ? (
                    <button
                      onClick={handleSave}
                      disabled={updateDispute.isPending}
                      className="px-5.5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{updateDispute.isPending ? "Saving..." : "Save Draft"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={sendDispute.isPending}
                      className="px-5.5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>{sendDispute.isPending ? "Sending..." : "Submit Claim"}</span>
                    </button>
                  )
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Disputes;

