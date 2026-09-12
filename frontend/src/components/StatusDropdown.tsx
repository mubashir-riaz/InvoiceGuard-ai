import React, { useState } from "react";
import { useUpdateDisputeStatus } from "../hooks/useApi";
import { RefreshCw, ChevronDown } from "lucide-react";

interface StatusDropdownProps {
  disputeId: number;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

const statusOptions = [
  { value: "DRAFT", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-800" },
  { value: "UNDER_REVIEW", label: "Under Review", color: "bg-amber-100 text-amber-800" },
  { value: "ACCEPTED", label: "Accepted", color: "bg-emerald-100 text-emerald-800" },
  { value: "PARTIALLY_APPROVED", label: "Partially Approved", color: "bg-teal-100 text-teal-800" },
  { value: "REFUNDED", label: "Refunded", color: "bg-green-100 text-green-900" },
  { value: "REJECTED", label: "Rejected", color: "bg-rose-100 text-rose-800" },
  { value: "ESCALATED", label: "Escalated", color: "bg-purple-100 text-purple-800" },
  { value: "EXPIRED", label: "Expired", color: "bg-slate-200 text-slate-600" },
];

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  disputeId,
  currentStatus,
  onStatusChange,
  disabled = false,
  size = "md",
}) => {
  const updateStatus = useUpdateDisputeStatus();
  const [isOpen, setIsOpen] = useState(false);

  const normalizedCurrent = currentStatus?.toUpperCase() || "DRAFT";
  const currentOption = statusOptions.find((o) => o.value === normalizedCurrent) || statusOptions[0];

  const handleSelect = (newStatus: string) => {
    if (newStatus === normalizedCurrent) {
      setIsOpen(false);
      return;
    }

    const note = `Status manually updated to ${newStatus}`;
    updateStatus.mutate(
      { id: disputeId, new_status: newStatus, note },
      {
        onSuccess: () => {
          setIsOpen(false);
          if (onStatusChange) onStatusChange(newStatus);
        },
      }
    );
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled || updateStatus.isPending}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 font-bold rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 ${
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
        }`}
      >
        {updateStatus.isPending ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
        ) : (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${currentOption.color}`}>
            {currentOption.label}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 z-30 animate-scale-up">
            <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Change Dispute Status
            </div>
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  opt.value === normalizedCurrent ? "font-bold text-indigo-600 bg-indigo-50/40" : "text-slate-700"
                }`}
              >
                <span>{opt.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${opt.color}`}>
                  {opt.value}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StatusDropdown;
