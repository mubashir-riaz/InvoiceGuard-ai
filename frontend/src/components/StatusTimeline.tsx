import React from "react";
import { ArrowRight, RefreshCw, Clock, History, CheckCircle2, AlertCircle } from "lucide-react";

interface StatusTimelineProps {
  events?: any[];
  isLoading?: boolean;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "SENT":
      return "bg-blue-500 ring-blue-100 text-blue-700 bg-blue-50";
    case "UNDER_REVIEW":
      return "bg-amber-500 ring-amber-100 text-amber-700 bg-amber-50";
    case "ACCEPTED":
    case "REFUNDED":
      return "bg-emerald-500 ring-emerald-100 text-emerald-700 bg-emerald-50";
    case "PARTIALLY_APPROVED":
      return "bg-teal-500 ring-teal-100 text-teal-700 bg-teal-50";
    case "REJECTED":
      return "bg-rose-500 ring-rose-100 text-rose-700 bg-rose-50";
    case "ESCALATED":
      return "bg-purple-500 ring-purple-100 text-purple-700 bg-purple-50";
    case "EXPIRED":
      return "bg-slate-400 ring-slate-100 text-slate-600 bg-slate-100";
    default:
      return "bg-slate-500 ring-slate-100 text-slate-700 bg-slate-50";
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

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  events = [],
  isLoading = false,
  className = "",
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
        <span className="text-xs font-semibold">Loading timeline events...</span>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <History className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs font-bold text-slate-600">No lifecycle events recorded yet</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Status transitions, replies, and follow-ups will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative border-l-2 border-slate-200 ml-4 pl-5 space-y-6 py-2 ${className}`}>
      {events.map((ev, index) => {
        const dotStyles = getStatusColor(ev.new_status);
        const dotBg = dotStyles.split(" ")[0];
        const ringColor = dotStyles.split(" ")[1];

        return (
          <div key={ev.id || index} className="relative group">
            {/* Timeline marker dot */}
            <div
              className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full ${dotBg} ring-4 ${ringColor} transition-transform group-hover:scale-125`}
            />

            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2 hover:border-indigo-100 hover:shadow-md transition-all">
              {/* Header: Transitions & Date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {ev.old_status && (
                    <>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-slate-100 text-slate-600 font-extrabold">
                        {ev.old_status}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-100">
                    {ev.new_status}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(ev.created_at || ev.timestamp)}</span>
                </div>
              </div>

              {/* Note Content */}
              {ev.note && (
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {ev.note}
                </p>
              )}

              {/* Author / Creator */}
              {ev.created_by && (
                <div className="text-[10px] text-slate-400 pt-0.5">
                  Logged by: <span className="font-semibold text-slate-600">{ev.created_by}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusTimeline;
