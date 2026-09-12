import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  useAllDisputes,
  useUpdateDispute, 
  useSendDispute,
  useUpdateDisputeStatus,
  useEscalateDispute,
  useScheduleFollowUp,
  useDisputeAnalytics
} from "../hooks/useApi";
import DataTable from "../components/DataTable";
import FollowUpBadge from "../components/FollowUpBadge";
import ResponseForm from "../components/ResponseForm";
import StatusDropdown from "../components/StatusDropdown";
import { 
  Mail, 
  Send, 
  Search, 
  Eye, 
  Clock, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowUpDown,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Percent
} from "lucide-react";

export const getDisputeStatusBadge = (status: string) => {
  const s = status?.toUpperCase();
  switch (s) {
    case "SENT":
      return { bg: "bg-blue-50 text-blue-700 border-blue-200/80", dot: "bg-blue-500", label: "SENT" };
    case "UNDER_REVIEW":
      return { bg: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500", label: "UNDER REVIEW" };
    case "ACCEPTED":
      return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80", dot: "bg-emerald-500", label: "ACCEPTED" };
    case "PARTIALLY_APPROVED":
      return { bg: "bg-teal-50 text-teal-700 border-teal-200/80", dot: "bg-teal-500", label: "PARTIAL" };
    case "REFUNDED":
      return { bg: "bg-green-100 text-green-900 border-green-300", dot: "bg-green-600", label: "REFUNDED" };
    case "REJECTED":
      return { bg: "bg-rose-50 text-rose-700 border-rose-200/80", dot: "bg-rose-500", label: "REJECTED" };
    case "ESCALATED":
      return { bg: "bg-purple-50 text-purple-700 border-purple-200/80", dot: "bg-purple-500", label: "ESCALATED" };
    case "EXPIRED":
      return { bg: "bg-slate-100 text-slate-500 border-slate-300", dot: "bg-slate-400", label: "EXPIRED" };
    default:
      return { bg: "bg-slate-50 text-slate-600 border-slate-200/80", dot: "bg-slate-400", label: "DRAFT" };
  }
};

const Disputes: React.FC = () => {
  const navigate = useNavigate();
  const { data: disputes, isLoading, refetch } = useAllDisputes();
  const analytics = useDisputeAnalytics();

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected" | "refunded">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_low" | "recovered_desc" | "status">("date_desc");

  // Quick Response Modal State
  const [selectedDisputeForResponse, setSelectedDisputeForResponse] = useState<any | null>(null);

  // Tab counts calculation
  const tabCounts = useMemo(() => {
    const list = disputes || [];
    return {
      all: list.length,
      pending: list.filter((d: any) => ["DRAFT", "SENT", "UNDER_REVIEW", "ESCALATED"].includes(d.status?.toUpperCase())).length,
      approved: list.filter((d: any) => ["ACCEPTED", "PARTIALLY_APPROVED"].includes(d.status?.toUpperCase())).length,
      rejected: list.filter((d: any) => ["REJECTED", "EXPIRED"].includes(d.status?.toUpperCase())).length,
      refunded: list.filter((d: any) => d.status?.toUpperCase() === "REFUNDED").length,
    };
  }, [disputes]);

  // Filter & Sort disputes
  const filteredAndSortedDisputes = useMemo(() => {
    const list = [...(disputes || [])];

    // Filter by search query
    const filtered = list.filter((d: any) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        String(d.id).includes(q) ||
        String(d.invoice_id).includes(q) ||
        d.carrier?.toLowerCase().includes(q);

      const status = d.status?.toUpperCase() || "DRAFT";
      let matchesTab = true;
      if (activeTab === "pending") {
        matchesTab = ["DRAFT", "SENT", "UNDER_REVIEW", "ESCALATED"].includes(status);
      } else if (activeTab === "approved") {
        matchesTab = ["ACCEPTED", "PARTIALLY_APPROVED"].includes(status);
      } else if (activeTab === "rejected") {
        matchesTab = ["REJECTED", "EXPIRED"].includes(status);
      } else if (activeTab === "refunded") {
        matchesTab = status === "REFUNDED";
      }

      return matchesSearch && matchesTab;
    });

    // Sort
    return filtered.sort((a: any, b: any) => {
      if (sortBy === "date_desc") return b.id - a.id;
      if (sortBy === "date_asc") return a.id - b.id;
      if (sortBy === "amount_desc") return Number(b.claimed_amount || 0) - Number(a.claimed_amount || 0);
      if (sortBy === "amount_low") return Number(a.claimed_amount || 0) - Number(b.claimed_amount || 0);
      if (sortBy === "recovered_desc") return Number(b.recovered_amount || 0) - Number(a.recovered_amount || 0);
      if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
      return 0;
    });
  }, [disputes, searchQuery, activeTab, sortBy]);

  const columns = [
    { 
      header: "Claim ID", 
      accessor: (row: any) => (
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-800">#CLAIM-{row.id}</span>
          {row.escalated && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-700">
              ESC
            </span>
          )}
        </div>
      )
    },
    { 
      header: "Invoice", 
      accessor: (row: any) => (
        <span className="font-semibold text-slate-500 text-xs">Invoice #{row.invoice_id}</span>
      )
    },
    { 
      header: "Carrier", 
      accessor: (row: any) => (
        <span className="font-semibold text-slate-700 text-xs">{row.carrier || "DHL Express"}</span>
      )
    },
    {
      header: "Claimed",
      accessor: (row: any) => (
        <span className="font-extrabold text-slate-800 text-xs">
          {row.claimed_amount != null ? `$${Number(row.claimed_amount).toFixed(2)}` : "-"}
        </span>
      ),
    },
    {
      header: "Recovered",
      accessor: (row: any) => {
        const recovered = Number(row.recovered_amount || 0);
        return (
          <span className={`font-extrabold text-xs ${recovered > 0 ? "text-emerald-600" : "text-slate-400"}`}>
            {recovered > 0 ? `$${recovered.toFixed(2)}` : "$0.00"}
          </span>
        );
      },
    },
    {
      header: "Recovery %",
      accessor: (row: any) => {
        const claimed = Number(row.claimed_amount || 0);
        const recovered = Number(row.recovered_amount || 0);
        const pct = claimed > 0 ? Math.min(100, Math.round((recovered / claimed) * 100)) : 0;

        if (recovered === 0) {
          return <span className="text-[11px] text-slate-400 font-medium">-</span>;
        }

        return (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-teal-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold ${pct === 100 ? "text-emerald-700" : "text-teal-700"}`}>
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessor: (row: any) => {
        const badge = getDisputeStatusBadge(row.status);
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            <span>{badge.label}</span>
          </span>
        );
      },
    },
    {
      header: "Follow-Up",
      accessor: (row: any) => (
        <FollowUpBadge followUpDate={row.follow_up_date} />
      ),
    },
    {
      header: "Actions",
      accessor: (row: any) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => navigate(`/disputes/${row.id}`)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
            title="Open full claim details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>

          <button
            onClick={() => setSelectedDisputeForResponse(row)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            title="Record carrier reply"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Claims Center</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review overcharges, track dispute resolutions, and monitor recovered freight revenue.
        </p>
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
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{analytics.totalDisputes}</span>
          </div>
        </div>

        {/* Pending Claims */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending & In Review</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{analytics.pendingCount}</span>
          </div>
        </div>

        {/* Recovered Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Recovered</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-emerald-600">${analytics.totalRecovered.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-medium">of ${analytics.totalClaimed.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-teal-50 text-teal-600">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Resolution Win Rate</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-teal-700">{analytics.successRate}%</span>
              <span className="text-xs text-slate-400 font-medium">({analytics.totalAccepted} of {analytics.totalSent} sent)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search / Sort Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
          {[
            { id: "all", label: "All", count: tabCounts.all },
            { id: "pending", label: "Pending", count: tabCounts.pending },
            { id: "approved", label: "Approved", count: tabCounts.approved },
            { id: "rejected", label: "Rejected", count: tabCounts.rejected },
            { id: "refunded", label: "Refunded", count: tabCounts.refunded },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tab.id 
                  ? "bg-white text-slate-800 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === tab.id ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-slate-400 text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="date_desc">Latest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Claimed: High to Low</option>
              <option value="amount_low">Claimed: Low to High</option>
              <option value="recovered_desc">Recovered: High to Low</option>
              <option value="status">Status (A-Z)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search carrier or invoice #..."
              className="w-full bg-slate-50 border border-slate-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 outline-none transition-all placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table Data */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500">Loading claims list...</p>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={filteredAndSortedDisputes} 
          onRowClick={(row) => navigate(`/disputes/${row.id}`)}
          emptyMessage="No dispute claims found in this view."
        />
      )}

      {/* Quick Record Response Modal */}
      {selectedDisputeForResponse && (
        <ResponseForm
          isOpen={!!selectedDisputeForResponse}
          onClose={() => setSelectedDisputeForResponse(null)}
          dispute={selectedDisputeForResponse}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default Disputes;
