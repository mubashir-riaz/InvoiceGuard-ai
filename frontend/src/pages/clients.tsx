import { useState, useMemo } from "react";
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useContracts,
  useInvoices
} from "../hooks/useApi";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Mail, 
  Building2, 
  FileText, 
  Briefcase,
  X,
  User,
  PlusCircle,
  AlertTriangle
} from "lucide-react";

const Clients = () => {
  const { data: clients, isLoading: isClientsLoading } = useClients();
  const { data: contracts } = useContracts();
  const { data: invoices } = useInvoices();

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [form, setForm] = useState({ name: "", email: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Compute stats per client
  const clientStatsMap = useMemo(() => {
    const stats: Record<number, { contractsCount: number; invoicesCount: number }> = {};
    
    clients?.forEach((c: any) => {
      stats[c.id] = { contractsCount: 0, invoicesCount: 0 };
    });

    contracts?.forEach((con: any) => {
      if (stats[con.client_id]) {
        stats[con.client_id].contractsCount += 1;
      }
    });

    invoices?.forEach((inv: any) => {
      if (stats[inv.client_id]) {
        stats[inv.client_id].invoicesCount += 1;
      }
    });

    return stats;
  }, [clients, contracts, invoices]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClient.mutate(
        { id: editingId, ...form },
        {
          onSuccess: () => {
            setEditingId(null);
            setShowModal(false);
          }
        }
      );
    } else {
      createClient.mutate(form, {
        onSuccess: () => setShowModal(false)
      });
    }
    setForm({ name: "", email: "" });
  };

  const handleEditClick = (client: any) => {
    setForm({ name: client.name, email: client.email });
    setEditingId(client.id);
    setShowModal(true);
  };

  const handleAddNewClick = () => {
    setForm({ name: "", email: "" });
    setEditingId(null);
    setShowModal(true);
  };

  if (isClientsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading client directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Client Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage corporate clients, active cargo volumes, and billing contacts.</p>
        </div>
        <button
          onClick={handleAddNewClick}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Grid List of Clients */}
      {clients && clients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c: any) => {
            const clientStats = clientStatsMap[c.id] || { contractsCount: 0, invoicesCount: 0 };
            
            return (
              <div 
                key={c.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between gap-6 relative group overflow-hidden"
              >
                {/* Visual Avatar Header */}
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-50 to-violet-50 text-indigo-600 border border-indigo-100/30">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 leading-snug">{c.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{c.email}</span>
                    </div>
                  </div>
                </div>

                {/* Live Client Stats */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50 text-sm">
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none">Contracts</span>
                      <span className="font-extrabold text-slate-700 mt-1 block">{clientStats.contractsCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none">Invoices</span>
                      <span className="font-extrabold text-slate-700 mt-1 block">{clientStats.invoicesCount}</span>
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Action Panel */}
                <div className="flex justify-end gap-2 border-t border-slate-50/50 pt-4.5">
                  <button
                    onClick={() => handleEditClick(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${c.name}? This will remove all linked data.`)) {
                        deleteClient.mutate(c.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-3">
          <div className="rounded-full bg-slate-50 p-4 text-slate-400">
            <User className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-700">No Clients Found</p>
            <p className="text-xs text-slate-400 mt-1">Add your first corporate account to begin tracking bills.</p>
          </div>
          <button
            onClick={handleAddNewClick}
            className="flex items-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl mt-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Client</span>
          </button>
        </div>
      )}

      {/* Slide-in Form Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-5 shadow-xl relative overflow-hidden transform transition-all animate-scale-up"
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? "Edit Client Details" : "Add New Client"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Configure client details for billing identification.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Corporate Name
                </label>
                <input
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none"
                  placeholder="Acme Logistical Corp"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                </label>
                <input
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none"
                  type="email"
                  placeholder="billing@acmelogistics.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5.5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-sm hover:shadow-md transition-all"
              >
                {editingId ? "Save Changes" : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Clients;

