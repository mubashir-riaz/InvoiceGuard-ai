import React from "react";
import { DollarSign, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface RecoveryCardProps {
  claimedAmount?: number | null;
  recoveredAmount?: number | null;
  status?: string;
  className?: string;
}

export const RecoveryCard: React.FC<RecoveryCardProps> = ({
  claimedAmount = 0,
  recoveredAmount = 0,
  status = "DRAFT",
  className = "",
}) => {
  const claimed = Number(claimedAmount || 0);
  const recovered = Number(recoveredAmount || 0);
  const difference = Math.max(0, claimed - recovered);
  const recoveryRate = claimed > 0 ? Math.min(100, (recovered / claimed) * 100) : 0;

  const isFullRecovery = recovered >= claimed && claimed > 0;
  const isPartial = recovered > 0 && recovered < claimed;
  const isRejected = status?.toUpperCase() === "REJECTED";

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Recovery Analysis</h3>
            <p className="text-xs text-slate-400">Carrier settlement vs claimed overcharges</p>
          </div>
        </div>

        {isFullRecovery && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Recovered</span>
          </span>
        )}
        {isPartial && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Partial Recovery ({recoveryRate.toFixed(0)}%)</span>
          </span>
        )}
        {isRejected && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Claim Denied</span>
          </span>
        )}
      </div>

      {/* Numerical Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        {/* Claimed */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Claimed Amount</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block">
            ${claimed.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Audit discrepancy total</span>
        </div>

        {/* Recovered */}
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Recovered Amount</span>
          <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
            ${recovered.toFixed(2)}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Settled credit memo</span>
        </div>

        {/* Variance / Difference */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Variance</span>
          <span className={`text-xl font-extrabold mt-1 block ${difference > 0 ? "text-slate-700" : "text-emerald-600"}`}>
            ${difference.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {difference === 0 ? "Zero variance" : "Unrecovered balance"}
          </span>
        </div>
      </div>

      {/* Progress Bar & Rate */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>Settlement Progress</span>
          </span>
          <span className="text-slate-800 font-bold">{recoveryRate.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFullRecovery
                ? "bg-emerald-500"
                : isPartial
                ? "bg-teal-500"
                : recovered > 0
                ? "bg-indigo-500"
                : "bg-slate-300"
            }`}
            style={{ width: `${Math.max(4, recoveryRate)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default RecoveryCard;
