import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useSingleDispute,
  useDisputeTimeline,
  useUpdateDispute,
  useSendDispute,
  useUpdateDisputeStatus,
  useEscalateDispute,
  useScheduleFollowUp,
  useDeleteDispute,
} from "../hooks/useApi";
import StatusTimeline from "../components/StatusTimeline";
import RecoveryCard from "../components/RecoveryCard";
import StatusDropdown from "../components/StatusDropdown";
import ResponseForm from "../components/ResponseForm";
import FollowUpBadge from "../components/FollowUpBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import useConfirm from "../hooks/useConfirm";
import {
  ArrowLeft,
  Mail,
  Send,
  Edit2,
  Check,
  Calendar,
  ShieldAlert,
  MessageSquare,
  FileText,
  Clock,
  ExternalLink,
  Copy,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Building2,
  Trash2,
} from "lucide-react";

const getStatusBadge = (status: string) => {
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

const DisputeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const disputeId = Number(id);
  const navigate = useNavigate();

  const { data: dispute, isLoading, refetch: refetchDispute } = useSingleDispute(disputeId);
  const { data: timelineData, isLoading: isTimelineLoading, refetch: refetchTimeline } = useDisputeTimeline(disputeId);

  const updateDispute = useUpdateDispute();
  const sendDispute = useSendDispute();
  const updateStatus = useUpdateDisputeStatus();
  const escalateDispute = useEscalateDispute();
  const scheduleFollowUp = useScheduleFollowUp();
  const deleteDispute = useDeleteDispute();
  const { confirm, dialogProps } = useConfirm();

  // Local UI State
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [followUpDateInput, setFollowUpDateInput] = useState("");
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false);

  // Sync draft body when dispute loads
  React.useEffect(() => {
    if (dispute?.draft_body) {
      setDraftBody(dispute.draft_body);
    }
  }, [dispute]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <RefreshCw className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading claim audit details...</p>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 space-y-4 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Dispute Claim Not Found</h3>
        <p className="text-xs text-slate-500">The dispute ID #{disputeId} does not exist or has been deleted.</p>
        <button
          onClick={() => navigate("/disputes")}
          className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700"
        >
          Return to Claims Center
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(dispute.status);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(draftBody || dispute.draft_body || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = () => {
    updateDispute.mutate(
      { id: dispute.id, draft_body: draftBody },
      {
        onSuccess: () => {
          setIsEditingDraft(false);
          refetchDispute();
        },
      }
    );
  };

  const handleSendClaim = () => {
    sendDispute.mutate(dispute.id, {
      onSuccess: () => {
        refetchDispute();
        refetchTimeline();
      },
    });
  };

  const handleEscalate = () => {
    escalateDispute.mutate(
      { id: dispute.id, note: "Escalated to carrier executive billing supervisor" },
      {
        onSuccess: () => {
          refetchDispute();
          refetchTimeline();
        },
      }
    );
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDateInput) return;
    scheduleFollowUp.mutate(
      { id: dispute.id, follow_up_date: followUpDateInput },
      {
        onSuccess: () => {
          setShowFollowUpPicker(false);
          setFollowUpDateInput("");
          refetchDispute();
          refetchTimeline();
        },
      }
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Back Navigation & Page Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/disputes")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Claims Center</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Lifecycle:</span>
          <StatusDropdown
            disputeId={dispute.id}
            currentStatus={dispute.status}
            onStatusChange={() => {
              refetchDispute();
              refetchTimeline();
            }}
          />
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                Rate Dispute Claim
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${statusBadge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                <span>{statusBadge.label}</span>
              </span>
              {dispute.escalated && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Escalated</span>
                </span>
              )}
              <FollowUpBadge followUpDate={dispute.follow_up_date} />
            </div>

            <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1.5">
              Claim #CLAIM-{dispute.id}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => setShowResponseModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Record Response</span>
            </button>

            <button
              onClick={async () => {
                const ok = await confirm({
                  title: "Delete Dispute Claim",
                  message: `Are you sure you want to delete Claim #CLAIM-${dispute.id} for invoice #${dispute.invoice_id}? All associated resolution history and timeline records will be permanently removed. This action cannot be undone.`,
                  confirmText: "Delete Claim",
                  isDestructive: true,
                });
                if (ok) {
                  deleteDispute.mutate(dispute.id, {
                    onSuccess: () => navigate("/disputes"),
                  });
                }
              }}
              disabled={deleteDispute.isPending}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              title="Delete Dispute Claim"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Metadata Details Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs font-semibold">
          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Carrier</span>
            <span className="text-slate-800 font-bold text-sm mt-0.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>{dispute.carrier || "DHL Express"}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Reference Bill</span>
            <Link
              to={`/invoices/${dispute.invoice_id}`}
              className="text-indigo-600 hover:underline font-bold text-sm mt-0.5 inline-flex items-center gap-1"
            >
              <span>Invoice #{dispute.invoice_id}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Claimed Overcharge</span>
            <span className="text-slate-800 font-extrabold text-sm block mt-0.5">
              ${Number(dispute.claimed_amount || 0).toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase tracking-wider text-[10px] block">Settled / Recovered</span>
            <span className={`font-extrabold text-sm block mt-0.5 ${Number(dispute.recovered_amount) > 0 ? "text-emerald-600" : "text-slate-600"}`}>
              ${Number(dispute.recovered_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Content & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Financial Recovery + Carrier Reply + Draft Email + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Recovery Card Visual */}
          <RecoveryCard
            claimedAmount={dispute.claimed_amount}
            recoveredAmount={dispute.recovered_amount}
            status={dispute.status}
          />

          {/* Section: Carrier Response Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Carrier Response</h3>
                  <p className="text-xs text-slate-400">Carrier resolution notes and audit outcome</p>
                </div>
              </div>

              {dispute.response_date && (
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Received {formatDateOnly(dispute.response_date)}</span>
                </span>
              )}
            </div>

            {dispute.carrier_response ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Official Carrier Feedback
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {dispute.carrier_response}
                  </p>
                </div>

                {dispute.rejection_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Denial Clause / Rejection Reason:</span>
                      <span className="font-medium">{dispute.rejection_reason}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-50/60 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Awaiting Carrier Resolution</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  No response recorded from carrier yet. Use the Record Response action to enter approved settlement amounts or denial justifications.
                </p>
                <button
                  onClick={() => setShowResponseModal(true)}
                  className="mt-1 px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Record Carrier Reply Now
                </button>
              </div>
            )}
          </div>

          {/* Section: Email Draft & Correspondence */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Dispute Claim Email</h3>
                  <p className="text-xs text-slate-400">Formal rate inquiry generated for carrier billing desk</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  title="Copy email copy"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>

                {dispute.status === "DRAFT" && (
                  <button
                    onClick={() => setIsEditingDraft(!isEditingDraft)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditingDraft ? "Cancel Edit" : "Edit Copy"}</span>
                  </button>
                )}
              </div>
            </div>

            {isEditingDraft ? (
              <div className="space-y-3">
                <textarea
                  className="w-full min-h-[240px] text-xs font-mono border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 rounded-xl outline-none leading-relaxed"
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingDraft(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    disabled={updateDispute.isPending}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    {updateDispute.isPending ? "Saving..." : "Save Draft"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 max-h-[280px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-[11px] leading-relaxed font-mono text-slate-600">
                  {draftBody || dispute.draft_body}
                </pre>
              </div>
            )}
          </div>

          {/* Section: Timeline of Events */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  Audit Lifecycle Timeline
                </h3>
                <p className="text-xs text-slate-400">
                  Chronological record of status changes, notifications, and resolutions
                </p>
              </div>
            </div>

            <StatusTimeline
              events={timelineData?.events || dispute.events || []}
              isLoading={isTimelineLoading}
            />
          </div>

        </div>

        {/* Right Sidebar: Quick Actions & Details */}
        <div className="space-y-6">
          
          {/* Actions Panel Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Claim Actions & Workflow
            </h3>

            <div className="space-y-2.5">
              {/* Draft Submission */}
              {dispute.status === "DRAFT" && (
                <button
                  onClick={handleSendClaim}
                  disabled={sendDispute.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendDispute.isPending ? "Submitting..." : "Dispatch Claim to Carrier"}</span>
                </button>
              )}

              {/* Record Response Button */}
              <button
                onClick={() => setShowResponseModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Record Carrier Resolution</span>
              </button>

              {/* Mark Under Review (if Sent) */}
              {dispute.status === "SENT" && (
                <button
                  onClick={() =>
                    updateStatus.mutate({
                      id: dispute.id,
                      new_status: "UNDER_REVIEW",
                      note: "Carrier confirmed receipt and assigned claim ticket #",
                    }, {
                      onSuccess: () => {
                        refetchDispute();
                        refetchTimeline();
                      }
                    })
                  }
                  disabled={updateStatus.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl transition-all"
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Mark as Under Review</span>
                </button>
              )}

              {/* Confirm Refunded in ERP */}
              {["ACCEPTED", "PARTIALLY_APPROVED"].includes(dispute.status) && (
                <button
                  onClick={() =>
                    updateStatus.mutate({
                      id: dispute.id,
                      new_status: "REFUNDED",
                      note: "Credit memo verified and reconciled against freight ledger",
                    }, {
                      onSuccess: () => {
                        refetchDispute();
                        refetchTimeline();
                      }
                    })
                  }
                  disabled={updateStatus.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-900 border border-green-200 font-bold text-xs rounded-xl transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Confirm Refund Received</span>
                </button>
              )}

              {/* Schedule Follow-up */}
              {!showFollowUpPicker ? (
                <button
                  onClick={() => setShowFollowUpPicker(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>{dispute.follow_up_date ? "Reschedule Follow-up" : "Schedule Follow-up"}</span>
                </button>
              ) : (
                <form onSubmit={handleFollowUpSubmit} className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <label className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Follow-up Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={followUpDateInput}
                    onChange={(e) => setFollowUpDateInput(e.target.value)}
                    className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowFollowUpPicker(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={scheduleFollowUp.isPending}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded"
                    >
                      {scheduleFollowUp.isPending ? "Saving..." : "Save Date"}
                    </button>
                  </div>
                </form>
              )}

              {/* Escalate Claim */}
              {!dispute.escalated && dispute.status !== "DRAFT" && (
                <button
                  onClick={handleEscalate}
                  disabled={escalateDispute.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl transition-all"
                >
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  <span>Escalate to Audit Supervisor</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Invoice Reference Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Related Invoice</span>
            </h3>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Invoice ID</span>
                <span className="font-bold text-slate-800">#{dispute.invoice_id}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Carrier</span>
                <span className="font-bold text-slate-800">{dispute.carrier || "DHL"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Claim Status</span>
                <span className="font-bold text-indigo-600">{dispute.status}</span>
              </div>
            </div>

            <Link
              to={`/invoices/${dispute.invoice_id}`}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <span>View Source Invoice & Discrepancies</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

      </div>

      {/* Response Modal */}
      <ResponseForm
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
        dispute={dispute}
        onSuccess={() => {
          refetchDispute();
          refetchTimeline();
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
};

export default DisputeDetail;
