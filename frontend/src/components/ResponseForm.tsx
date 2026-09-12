import React, { useState, useEffect } from "react";
import { useRecordCarrierResponse } from "../hooks/useApi";
import { X, MessageSquare, DollarSign, Calendar, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

interface ResponseFormProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: {
    id: number;
    claimed_amount?: number;
    recovered_amount?: number;
    carrier?: string;
  };
  onSuccess?: (updated: any) => void;
}

export const ResponseForm: React.FC<ResponseFormProps> = ({
  isOpen,
  onClose,
  dispute,
  onSuccess,
}) => {
  const recordResponse = useRecordCarrierResponse();

  const [status, setStatus] = useState<string>("ACCEPTED");
  const [recoveredAmount, setRecoveredAmount] = useState<string>("");
  const [carrierResponse, setCarrierResponse] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [responseDate, setResponseDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (isOpen && dispute) {
      const initialClaimed = dispute.claimed_amount ? String(dispute.claimed_amount) : "";
      setRecoveredAmount(initialClaimed);
      setStatus("ACCEPTED");
      setCarrierResponse("");
      setRejectionReason("");
      setResponseDate(new Date().toISOString().split("T")[0]);
      setNote("");
    }
  }, [isOpen, dispute]);

  // Adjust recovered amount when status changes
  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === "REJECTED") {
      setRecoveredAmount("0.00");
    } else if (newStatus === "ACCEPTED" && dispute.claimed_amount) {
      setRecoveredAmount(String(dispute.claimed_amount));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const recVal = recoveredAmount ? parseFloat(recoveredAmount) : 0;

    recordResponse.mutate(
      {
        id: dispute.id,
        status,
        recovered_amount: isNaN(recVal) ? 0 : recVal,
        carrier_response: carrierResponse,
        rejection_reason: ["REJECTED", "PARTIALLY_APPROVED"].includes(status) ? rejectionReason : undefined,
        response_date: responseDate || undefined,
        note: note || `Carrier official reply recorded with outcome: ${status}`,
      },
      {
        onSuccess: (updated) => {
          if (onSuccess) onSuccess(updated);
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 p-6 md:p-7 space-y-5 shadow-2xl relative my-8 animate-scale-up">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Record Carrier Response</h3>
            <p className="text-xs text-slate-400">
              Claim #CLAIM-{dispute.id} &bull; {dispute.carrier || "Carrier"}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Outcome Status Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Carrier Resolution Outcome
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "ACCEPTED", label: "Accepted (Full)", color: "border-emerald-500 bg-emerald-50 text-emerald-800" },
                { val: "PARTIALLY_APPROVED", label: "Partial Approved", color: "border-teal-500 bg-teal-50 text-teal-800" },
                { val: "REFUNDED", label: "Direct Refunded", color: "border-green-600 bg-green-50 text-green-900" },
                { val: "REJECTED", label: "Rejected (Denied)", color: "border-rose-500 bg-rose-50 text-rose-800" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleStatusChange(opt.val)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all text-left flex items-center justify-between ${
                    status === opt.val
                      ? `${opt.color} ring-2 ring-indigo-500/20 shadow-sm`
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt.label}</span>
                  {status === opt.val && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Recovered Amount & Response Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Recovered Amount ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                  value={recoveredAmount}
                  onChange={(e) => setRecoveredAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Original claimed: ${Number(dispute.claimed_amount || 0).toFixed(2)}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Response Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={responseDate}
                  onChange={(e) => setResponseDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Carrier Official Message / Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Carrier Response Details / Ticket Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Carrier credit memo #CR-8891 issued for discrepancy, or tariff breakdown details..."
              value={carrierResponse}
              onChange={(e) => setCarrierResponse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Rejection Reason (Conditional) */}
          {["REJECTED", "PARTIALLY_APPROVED"].includes(status) && (
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
              <label className="text-xs font-bold text-rose-800 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Rejection / Denial Reason</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Carrier claims peak surcharge tariffs apply to contract schedule"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-white border border-rose-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          )}

          {/* Internal Audit Note */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Internal Audit Log Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Verified by Billing Manager with DHL claims desk"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordResponse.isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
            >
              {recordResponse.isPending ? "Saving..." : "Save Carrier Response"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ResponseForm;
