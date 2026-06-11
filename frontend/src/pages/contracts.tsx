import { useState, useMemo } from "react";
import {
  useContracts,
  useClients,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
} from "../hooks/useApi";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Building2, 
  Truck, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Briefcase, 
  Clock,
  PlusCircle
} from "lucide-react";

const Contracts = () => {
  const { data: contracts, isLoading: isContractsLoading } = useContracts();
  const { data: clients } = useClients();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  // Modal and Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [clientId, setClientId] = useState<number>(0);
  const [carrier, setCarrier] = useState("");
  const [baseRate, setBaseRate] = useState<string>("0");
  const [perKgRate, setPerKgRate] = useState<string>("0");
  const [effectiveStart, setEffectiveStart] = useState("");
  const [effectiveEnd, setEffectiveEnd] = useState("");

  // Map Client ID to Client Name
  const clientNameMap = useMemo(() => {
    const mapping: Record<number, string> = {};
    clients?.forEach((c: any) => {
      mapping[c.id] = c.name;
    });
    return mapping;
  }, [clients]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rateDetails = {
      base_rate: Number(baseRate),
      per_kg: Number(perKgRate),
    };

    const payload = {
      client_id: Number(clientId),
      carrier,
      rate_details: rateDetails,
      effective_start: effectiveStart,
      effective_end: effectiveEnd,
    };

    if (editingId) {
      updateContract.mutate(
        { id: editingId, ...payload },
        {
          onSuccess: () => {
            setShowModal(false);
            resetForm();
          }
        }
      );
    } else {
      createContract.mutate(payload, {
        onSuccess: () => {
          setShowModal(false);
          resetForm();
        }
      });
    }
  };

  const handleEditClick = (contract: any) => {
    setEditingId(contract.id);
    setClientId(contract.client_id);
    setCarrier(contract.carrier);
    setBaseRate(String(contract.rate_details?.base_rate ?? 0));
    setPerKgRate(String(contract.rate_details?.per_kg ?? 0));
    setEffectiveStart(contract.effective_start || "");
    setEffectiveEnd(contract.effective_end || "");
    setShowModal(true);
  };

  const handleAddNewClick = () => {
    resetForm();
    setEditingId(null);
    if (clients && clients.length > 0) {
      setClientId(clients[0].id);
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setClientId(0);
    setCarrier("");
    setBaseRate("0");
    setPerKgRate("0");
    setEffectiveStart("");
    setEffectiveEnd("");
  };

  // Helper to determine if contract is currently active
  const getContractStatus = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return { active: false, label: "Unknown" };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (now >= start && now <= end) {
      return { active: true, label: "Active" };
    } else if (now < start) {
      return { active: false, label: "Pending" };
    } else {
      return { active: false, label: "Expired" };
    }
  };

  if (isContractsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading active contract tariffs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Contract Tariffs</h2>
          <p className="text-sm text-slate-500 mt-1">Configure base and weight rates for carriers to audit incoming invoices.</p>
        </div>
        <button
          onClick={handleAddNewClick}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add Contract</span>
        </button>
      </div>

      {/* Grid of Contracts */}
      {contracts && contracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contracts.map((c: any) => {
            const clientName = clientNameMap[c.client_id] || `Client #${c.client_id}`;
            const status = getContractStatus(c.effective_start, c.effective_end);
            
            return (
              <div 
                key={c.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between gap-6 relative overflow-hidden"
              >
                {/* Header: Carrier Name & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-50 to-slate-100 text-slate-600 border border-slate-200/40">
                      <Truck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 leading-none">{c.carrier}</h3>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1 block">Contract ID #{c.id}</span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    status.active 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100/50" 
                      : status.label === "Pending" 
                      ? "bg-amber-50 text-amber-700 border-amber-100/50" 
                      : "bg-slate-100 text-slate-500 border-slate-200/50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status.active ? "bg-emerald-500" : status.label === "Pending" ? "bg-amber-500" : "bg-slate-400"
                    }`} />
                    <span>{status.label}</span>
                  </span>
                </div>

                {/* Rates Detail Panel */}
                <div className="bg-slate-50/70 p-4 rounded-2xl space-y-2 border border-slate-100/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Base Shipment Rate:</span>
                    <span className="font-extrabold text-slate-800">${Number(c.rate_details?.base_rate ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Weight Charge (Per Kg):</span>
                    <span className="font-extrabold text-slate-800">${Number(c.rate_details?.per_kg ?? 0).toFixed(2)}/kg</span>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="space-y-2.5 text-xs border-t border-slate-50/60 pt-4 font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Account: <span className="text-slate-700 font-bold">{clientName}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Validity: <span className="text-slate-700 font-bold">{c.effective_start} to {c.effective_end}</span></span>
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
                      if (confirm(`Delete contract ID #${c.id} for ${c.carrier}?`)) {
                        deleteContract.mutate(c.id);
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
            <Briefcase className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-700">No Carrier Contracts Found</p>
            <p className="text-xs text-slate-400 mt-1">Configure your first carrier contract tariff sheet to enable auditing.</p>
          </div>
          <button
            onClick={handleAddNewClick}
            className="flex items-center gap-1.5 bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl mt-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Contract</span>
          </button>
        </div>
      )}

      {/* Contract Builder Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden transform transition-all animate-scale-up"
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
                {editingId ? "Edit Contract Terms" : "Add Contract Tariffs"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Define billing rates with carriers to compare against incoming invoices.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Client Selection */}
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Client Account
                </label>
                <select
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 outline-none"
                  value={clientId}
                  onChange={(e) => setClientId(Number(e.target.value))}
                  required
                >
                  <option value={0}>-- Select Client --</option>
                  {clients?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Carrier input */}
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" /> Carrier
                </label>
                <input
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none"
                  placeholder="DHL Express / FedEx / UPS"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  required
                />
              </div>

              {/* Base Rate input */}
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-400" /> Base Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 outline-none"
                  placeholder="10.00"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  required
                />
              </div>

              {/* Per Kg Rate input */}
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <DollarSign className="w-3 h-3 text-slate-400" /> Per Kg Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 outline-none"
                  placeholder="1.50"
                  value={perKgRate}
                  onChange={(e) => setPerKgRate(e.target.value)}
                  required
                />
              </div>

              {/* Validity Start */}
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 outline-none"
                  value={effectiveStart}
                  onChange={(e) => setEffectiveStart(e.target.value)}
                  required
                />
              </div>

              {/* Validity End */}
              <div>
                <label className="flex text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> End Date
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 outline-none"
                  value={effectiveEnd}
                  onChange={(e) => setEffectiveEnd(e.target.value)}
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
                disabled={clientId === 0}
                className="px-5.5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              >
                {editingId ? "Save Changes" : "Save Contract"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Contracts;

