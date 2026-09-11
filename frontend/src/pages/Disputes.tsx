import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { 
  useUpdateDispute, 
  useSendDispute,
  useDisputeTimeline,
  useUpdateDisputeStatus,
  useRecordCarrierResponse,
  useEscalateDispute,
  useScheduleFollowUp
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
  FileText,
  Clock,
  TrendingUp,
  History,
  Calendar,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  MessageSquare
} from "lucide-react";

const getStatusBadge = (status: string) => {
  const s = status?.toUpperCase();
  switch (s) {
    case "SENT":
      return { bg: "bg-blue-50 text-blue-700 border-blue-200/60", dot: "bg-blue-500", label: "SENT" };
    case "UNDER_REVIEW":
      return { bg: "bg-amber-50 text-amber-700 border-amber-200/60", dot: "bg-amber-500", label: "UNDER REVIEW" };
    case "ACCEPTED":
      return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60", dot: "bg-emerald-500", label: "ACCEPTED" };
    case "PARTIALLY_APPROVED":
      return { bg: "bg-teal-50 text-teal-700 border-teal-200/60", dot: "bg-teal-500", label: "PARTIAL" };
    case "REFUNDED":
      return { bg: "bg-green-100 text-green-800 border-green-300", dot: "bg-green-600", label: "REFUNDED" };
    case "REJECTED":
      return { bg: "bg-rose-50 text-rose-700 border-rose-200/60", dot: "bg-rose-500", label: "REJECTED" };
    case "ESCALATED":
      return { bg: "bg-purple-50 text-purple-700 border-purple-200/60", dot: "bg-purple-500", label: "ESCALATED" };
    case "EXPIRED":
      return { bg: "bg-slate-100 text-slate-500 border-slate-300", dot: "bg-slate-400", label: "EXPIRED" };
    default:
      return { bg: "bg-slate-50 text-slate-600 border-slate-200/60", dot: "bg-slate-400", label: "DRAFT" };
  }
};

const formatDateTime = (isoString?: string | null) => {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const formatDateOnly = (isoString?: string | null) => {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
};

const Disputes = () => {
  const { data: disputes, isLoading, refetch } = useQuery({
    queryKey: ["allDisputes"],
    queryFn: () => api.get("/disputes/").then((r) => r.data),
  });

  const updateDispute = useUpdateDispute();
  const sendDispute = useSendDispute();
  const updateStatus = useUpdateDisputeStatus();
  const recordResponse = useRecordCarrierResponse();
  const escalateDispute = useEscalateDispute();
  const scheduleFollowUp = useScheduleFollowUp();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'draft', 'sent', 'under_review', 'resolved', 'escalated'

  // Selected dispute for modal detail view
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"email" | "timeline">("email");
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");

  // Timeline & Response Form State
  const { data: timelineData, isLoading: isTimelineLoading, refetch: refetchTimeline } = useDisputeTimeline(selectedDispute?.id);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseForm, setResponseForm] = useState({
    recovered_amount: "",
    status: "ACCEPTED",
    carrier_response: "",
    rejection_reason: "",
    note: "",
  });

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");

  // Calculate KPI stats
  const stats = useMemo(() => {
    const list = disputes || [];
    const totalCount = list.length;
    const draftCount = list.filter((d: any) => d.status?.toUpperCase() === "DRAFT").length;
    const inProgressCount = list.filter((d: any) => 
      ["SENT", "UNDER_REVIEW"].includes(d.status?.toUpperCase())
    ).length;
    
    let totalClaimedAmount = 0;
    let totalRecoveredAmount = 0;
    list.forEach((d: any) => {
      if (d.claimed_amount != null) {
        totalClaimedAmount += Number(d.claimed_amount);
      } else {
        const match = d.draft_body?.match(/Total Overcharge:\s*\$([0-9,.]+)/i);
        if (match && match[1]) {
          const val = parseFloat(match[1].replace(/,/g, ""));
          if (!isNaN(val)) totalClaimedAmount += val;
        }
      }
      if (d.recovered_amount != null) {
        totalRecoveredAmount += Number(d.recovered_amount);
      }
    });

    return {
      totalCount,
      draftCount,
      inProgressCount,
      totalClaimedAmount: totalClaimedAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      totalRecoveredAmount: totalRecoveredAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [disputes]);

  const handleRowClick = (dispute: any) => {
    setSelectedDispute(dispute);
    setEditBody(dispute.draft_body);
    setIsEditing(false);
    setActiveModalTab("email");
    setShowResponseForm(false);
    setShowFollowUpForm(false);
  };

  const handleSave = () => {
    if (!selectedDispute) return;
    updateDispute.mutate(
      { id: selectedDispute.id, draft_body: editBody },
      {
        onSuccess: () => {
          setIsEditing(false);
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

  const handleStatusTransition = (new_status: string, note?: string) => {
    if (!selectedDispute) return;
    updateStatus.mutate(
      { id: selectedDispute.id, new_status, note },
      {
        onSuccess: (updated) => {
          setSelectedDispute(updated);
          refetch();
          refetchTimeline();
        }
      }
    );
  };

  const handleRecordResponseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;
    recordResponse.mutate(
      {
        id: selectedDispute.id,
        recovered_amount: responseForm.recovered_amount ? parseFloat(responseForm.recovered_amount) : 0,
        status: responseForm.status,
        carrier_response: responseForm.carrier_response,
        rejection_reason: responseForm.rejection_reason,
        note: responseForm.note,
      },
      {
        onSuccess: (updated) => {
          setSelectedDispute(updated);
          setShowResponseForm(false);
          refetch();
          refetchTimeline();
        }
      }
    );
  };

  const handleScheduleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !followUpDate) return;
    scheduleFollowUp.mutate(
      { id: selectedDispute.id, follow_up_date: followUpDate },
      {
        onSuccess: (updated) => {
          setSelectedDispute(updated);
          setShowFollowUpForm(false);
          refetch();
          refetchTimeline();
        }
      }
    );
  };

  const handleEscalateClick = () => {
    if (!selectedDispute) return;
    escalateDispute.mutate(
      { id: selectedDispute.id, note: "Escalated to carrier executive relations & auditing supervisor." },
      {
        onSuccess: (updated) => {
          setSelectedDispute(updated);
          refetch();
          refetchTimeline();
        }
      }
    );
  };

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    const list = disputes || [];
    return list.filter((d: any) => {
      const matchesSearch = 
        String(d.id).includes(searchQuery) ||
        String(d.invoice_id).includes(searchQuery) ||
        d.carrier?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const status = d.status?.toUpperCase();
      let matchesTab = true;
      if (activeTab === "draft") matchesTab = status === "DRAFT";
      else if (activeTab === "in_progress") matchesTab = ["SENT", "UNDER_REVIEW"].includes(status);
      else if (activeTab === "resolved") matchesTab = ["ACCEPTED", "PARTIALLY_APPROVED", "REFUNDED", "REJECTED"].includes(status);
      else if (activeTab === "escalated") matchesTab = status === "ESCALATED" || d.escalated === true;

      return matchesSearch && matchesTab;
    });
  }, [disputes, searchQuery, activeTab]);

  const columns = [
    { 
      header: "Claim ID", 
      accessor: (row: any) => (
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-800">#CLAIM-{row.id}</span>
          {row.escalated && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-100 text-purple-700">
              ESC
            </span>
          )}
        </div>
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
      header: "Claimed",
      accessor: (row: any) => (
        <span className="font-semibold text-slate-700 text-xs">
          {row.claimed_amount != null ? `$${Number(row.claimed_amount).toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      header: "Recovered",
      accessor: (row: any) => (
        <span className={`font-semibold text-xs ${Number(row.recovered_amount) > 0 ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
          {row.recovered_amount != null && Number(row.recovered_amount) > 0 ? `$${Number(row.recovered_amount).toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row: any) => {
        const badge = getStatusBadge(row.status);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            <span>{badge.label}</span>
          </span>
        );
      },
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
        <p className="text-sm text-slate-500 mt-1">Review AI-generated rate disputes, track dispute lifecycles, and monitor recovered revenue.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Claims */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Claims</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.totalCount}</span>
          </div>
        </div>

        {/* Pending Drafts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Drafts</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.draftCount}</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.inProgressCount}</span>
          </div>
        </div>

        {/* Recovered Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recovered Revenue</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-emerald-600">${stats.totalRecoveredAmount}</span>
              <span className="text-xs text-slate-400 font-medium">of ${stats.totalClaimedAmount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Claims
          </button>
          <button
            onClick={() => setActiveTab("draft")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "draft" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveTab("in_progress")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "in_progress" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab("resolved")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "resolved" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setActiveTab("escalated")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "escalated" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Escalated
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-5 shadow-2xl relative my-8 max-h-[92vh] flex flex-col">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedDispute(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">Dispute Claim Audit</span>
                {(() => {
                  const badge = getStatusBadge(selectedDispute.status);
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </span>
                  );
                })()}
                {selectedDispute.escalated && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                    Escalated
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                Claim #CLAIM-{selectedDispute.id}
              </h3>
            </div>

            {/* Metadata Section */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-500 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Carrier</span>
                <span className="text-slate-800 font-bold text-sm block mt-0.5">{selectedDispute.carrier || "DHL Express"}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Reference</span>
                <a 
                  href={`/invoices/${selectedDispute.invoice_id}`}
                  className="text-indigo-600 hover:underline font-bold text-sm mt-0.5 flex items-center gap-1"
                >
                  <span>Invoice #{selectedDispute.invoice_id}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Claimed</span>
                <span className="text-slate-800 font-bold text-sm block mt-0.5">
                  {selectedDispute.claimed_amount != null ? `$${Number(selectedDispute.claimed_amount).toFixed(2)}` : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Recovered</span>
                <span className={`font-bold text-sm block mt-0.5 ${Number(selectedDispute.recovered_amount) > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                  {selectedDispute.recovered_amount != null ? `$${Number(selectedDispute.recovered_amount).toFixed(2)}` : "$0.00"}
                </span>
              </div>
            </div>

            {/* Follow-up & Response Date Ribbon */}
            {(selectedDispute.follow_up_date || selectedDispute.response_date) && (
              <div className="flex flex-wrap gap-4 text-xs bg-amber-50/50 border border-amber-200/50 rounded-xl px-3.5 py-2 text-amber-900">
                {selectedDispute.response_date && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Response received: <strong>{formatDateOnly(selectedDispute.response_date)}</strong></span>
                  </div>
                )}
                {selectedDispute.follow_up_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Next follow-up target: <strong>{formatDateOnly(selectedDispute.follow_up_date)}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Modal Tabs Bar */}
            <div className="flex border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveModalTab("email")}
                className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
                  activeModalTab === "email" 
                    ? "border-indigo-600 text-indigo-600" 
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Dispute Draft</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("timeline")}
                className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
                  activeModalTab === "timeline" 
                    ? "border-indigo-600 text-indigo-600" 
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Timeline ({timelineData?.events?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body Area (Scrollable) */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-4 min-h-[220px]">
              
              {/* Tab 1: Dispute Email & Carrier Notes */}
              {activeModalTab === "email" && (
                <div className="space-y-4">
                  {/* Carrier Feedback Callout (if recorded) */}
                  {selectedDispute.carrier_response && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Carrier Response Details</span>
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {selectedDispute.carrier_response}
                      </p>
                      {selectedDispute.rejection_reason && (
                        <p className="text-xs text-rose-600 font-semibold pt-1">
                          Rejection Reason: {selectedDispute.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {isEditing ? (
                    <textarea
                      className="w-full min-h-[220px] text-xs font-mono border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 rounded-xl outline-none"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-[260px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-[11px] leading-relaxed font-mono text-slate-600">
                        {selectedDispute.draft_body}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Timeline View */}
              {activeModalTab === "timeline" && (
                <div className="space-y-3">
                  {isTimelineLoading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Loading timeline logs...</span>
                    </div>
                  ) : (!timelineData?.events || timelineData.events.length === 0) ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No lifecycle events recorded for this dispute yet.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-4 pl-4 space-y-4">
                      {timelineData.events.map((ev: any) => (
                        <div key={ev.id} className="relative group">
                          {/* Dot */}
                          <div className="absolute -left-[22px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                          
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5 font-bold">
                                {ev.old_status && (
                                  <>
                                    <span className="text-slate-500">{ev.old_status}</span>
                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                  </>
                                )}
                                <span className="text-indigo-600">{ev.new_status}</span>
                              </div>
                              <span className="text-slate-400">{formatDateTime(ev.timestamp)}</span>
                            </div>
                            {ev.note && (
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">{ev.note}</p>
                            )}
                            {ev.created_by && (
                              <div className="text-[10px] text-slate-400">By: {ev.created_by}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form: Record Carrier Response */}
              {showResponseForm && (
                <form onSubmit={handleRecordResponseSubmit} className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span>Record Carrier Resolution</span>
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setShowResponseForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Carrier Status Outcome</label>
                      <select
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                        value={responseForm.status}
                        onChange={(e) => setResponseForm({ ...responseForm, status: e.target.value })}
                      >
                        <option value="ACCEPTED">ACCEPTED (Full Approval)</option>
                        <option value="PARTIALLY_APPROVED">PARTIALLY_APPROVED</option>
                        <option value="REFUNDED">REFUNDED (Direct Credit Issued)</option>
                        <option value="REJECTED">REJECTED (Claim Denied)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Recovered Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                        value={responseForm.recovered_amount}
                        onChange={(e) => setResponseForm({ ...responseForm, recovered_amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Carrier's Reply Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Enter carrier explanation or reference ticket number..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
                      value={responseForm.carrier_response}
                      onChange={(e) => setResponseForm({ ...responseForm, carrier_response: e.target.value })}
                    />
                  </div>

                  {["REJECTED", "PARTIALLY_APPROVED"].includes(responseForm.status) && (
                    <div>
                      <label className="text-[11px] font-semibold text-rose-700 block mb-1">Rejection Reason</label>
                      <input
                        type="text"
                        placeholder="e.g., Tariff clause 4.2 peak surcharge applies"
                        className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-rose-500"
                        value={responseForm.rejection_reason}
                        onChange={(e) => setResponseForm({ ...responseForm, rejection_reason: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowResponseForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={recordResponse.isPending}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
                    >
                      {recordResponse.isPending ? "Saving..." : "Save Carrier Response"}
                    </button>
                  </div>
                </form>
              )}

              {/* Form: Schedule Follow-up */}
              {showFollowUpForm && (
                <form onSubmit={handleScheduleFollowUpSubmit} className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>Schedule Carrier Follow-up Reminder</span>
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setShowFollowUpForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Follow-up Target Date</label>
                    <input
                      type="date"
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-amber-500"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowFollowUpForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={scheduleFollowUp.isPending}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-sm"
                    >
                      {scheduleFollowUp.isPending ? "Saving..." : "Set Follow-up Date"}
                    </button>
                  </div>
                </form>
              )}

            </div>

            {/* Actions Panel Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {selectedDispute.status === "DRAFT" ? (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditing ? "View Copy" : "Edit Draft"}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                      className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 text-xs font-semibold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/60 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{selectedDispute.follow_up_date ? "Reschedule Follow-up" : "Schedule Follow-up"}</span>
                    </button>

                    {!selectedDispute.escalated && (
                      <button
                        onClick={handleEscalateClick}
                        disabled={escalateDispute.isPending}
                        className="flex items-center gap-1.5 text-purple-700 hover:text-purple-900 text-xs font-semibold bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200/60 transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Escalate Claim</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                
                {selectedDispute.status === "DRAFT" && (
                  isEditing ? (
                    <button
                      onClick={handleSave}
                      disabled={updateDispute.isPending}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{updateDispute.isPending ? "Saving..." : "Save Draft"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={sendDispute.isPending}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>{sendDispute.isPending ? "Sending..." : "Submit Claim"}</span>
                    </button>
                  )
                )}

                {selectedDispute.status === "SENT" && (
                  <>
                    <button
                      onClick={() => handleStatusTransition("UNDER_REVIEW", "Carrier confirmed receipt and initiated audit review.")}
                      disabled={updateStatus.isPending}
                      className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-100 font-bold text-xs transition-all"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => setShowResponseForm(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs shadow-sm transition-all"
                    >
                      Record Response
                    </button>
                  </>
                )}

                {selectedDispute.status === "UNDER_REVIEW" && (
                  <button
                    onClick={() => setShowResponseForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs shadow-sm transition-all"
                  >
                    Record Carrier Response
                  </button>
                )}

                {["ACCEPTED", "PARTIALLY_APPROVED"].includes(selectedDispute.status) && (
                  <button
                    onClick={() => handleStatusTransition("REFUNDED", "Refund credit memo received and reconciled.")}
                    disabled={updateStatus.isPending}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Refunded</span>
                  </button>
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

