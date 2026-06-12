import { useState, useMemo } from "react";
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
import { 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  TrendingUp, 
  FileText, 
  AlertTriangle,
  FileCheck,
  RefreshCw
} from "lucide-react";

const Dashboard = () => {
  const { data: invoices, isLoading, refetch } = useInvoices();
  const { data: clients } = useClients();
  const navigate = useNavigate();
  const process = useProcessInvoice();
  const audit = useAuditInvoice();
  const [showUpload, setShowUpload] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");


  // Calculate stats based on real data
  const stats = useMemo(() => {
    const list = invoices || [];
    const totalCount = list.length;
    const totalAmount = list.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
    const auditedCount = list.filter((inv: any) => {
      const status = inv.status?.toLowerCase();
      return status === "audited" || status === "disputed";
    }).length;
    const disputedCount = list.filter((inv: any) => inv.status?.toLowerCase() === "disputed").length;
    
    return {
      totalCount,
      totalAmount: totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      auditedCount,
      disputedCount
    };
  }, [invoices]);

  // Filter invoices list
  const filteredInvoices = useMemo(() => {
    const list = invoices || [];
    return list.filter((inv: any) => {
      const matchesSearch = 
        inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.carrier?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" || 
        inv.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const columns = [
    { 
      header: "Invoice #", 
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs">
            {row.carrier?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-800 block">{row.invoice_number}</span>
            <span className="text-[10px] text-slate-400 font-semibold block">ID #{row.id}</span>
          </div>
        </div>
      )
    },
    { 
      header: "Carrier", 
      accessor: (row: any) => (
        <span className="font-semibold text-slate-700">{row.carrier}</span>
      ) 
    },
    { 
      header: "Date", 
      accessor: (row: any) => (
        <span className="text-slate-500 font-medium">{row.invoice_date}</span>
      )
    },
    { 
      header: "Total Value", 
      accessor: (row: any) => (
        <span className="font-bold text-slate-800">${Number(row.total_amount).toFixed(2)}</span>
      )
    },
    {
      header: "Audit Status",
      accessor: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessor: (row: any) => {
        const isProcessing = process.isPending && process.variables === row.id;
        const isAuditing = audit.isPending && audit.variables === row.id;

        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {row.status?.toLowerCase() === "uploaded" && (
              <button
                onClick={() => process.mutate(row.id)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Extract AI</span>
              </button>
            )}
            
            {row.status?.toLowerCase() === "extracted" && (
              <button
                onClick={() => audit.mutate(row.id)}
                disabled={isAuditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold text-xs transition-all disabled:opacity-50"
              >
                {isAuditing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>Audit rates</span>
              </button>
            )}

            <button
              onClick={() => navigate(`/invoices/${row.id}`)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              title="View Invoice Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Audit Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Audit carrier freight bills, check discrepancy details, and file claims.</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Upload Invoice</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Invoices</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.totalCount}</span>
          </div>
        </div>

        {/* Audited Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-600">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Audited Bills</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.auditedCount}</span>
          </div>
        </div>

        {/* Potential Savings / Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Value Audited</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">${stats.totalAmount}</span>
          </div>
        </div>

        {/* Open Disputes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 rounded-xl bg-orange-50 text-orange-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Disputes Lodged</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.disputedCount}</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or carrier..."
            className="w-full bg-slate-50 border border-slate-200/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none transition-all placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            <span>Filter By:</span>
          </div>
          <select
            className="bg-slate-50 border border-slate-200/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none transition-all cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Invoices</option>
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="extracted">Extracted</option>
            <option value="audited">Audited</option>
            <option value="disputed">Disputed</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-500">Loading audit records...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredInvoices}
            onRowClick={(row) => navigate(`/invoices/${row.id}`)}
            emptyMessage="No invoices match your search or filter."
          />
        )}
      </div>

      {/* Upload Modal Overlay */}
      {showUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl transform transition-all animate-scale-up">
              <FileUpload 
                onClose={() => {
                  setShowUpload(false);
                  refetch();
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

