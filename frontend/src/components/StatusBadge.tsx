import { 
  UploadCloud, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  ShieldAlert 
} from "lucide-react";

interface StatusConfig {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  uploaded: {
    color: "bg-blue-50 text-blue-700 border-blue-200/60",
    icon: UploadCloud,
    label: "Uploaded",
  },
  processing: {
    color: "bg-amber-50 text-amber-700 border-amber-200/60 animate-pulse",
    icon: Loader2,
    label: "Processing",
  },
  extracted: {
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    icon: Sparkles,
    label: "Extracted",
  },
  audited: {
    color: "bg-purple-50 text-purple-700 border-purple-200/60",
    icon: ShieldCheck,
    label: "Audited",
  },
  disputed: {
    color: "bg-orange-50 text-orange-700 border-orange-200/60",
    icon: AlertCircle,
    label: "Disputed",
  },
  error: {
    color: "bg-rose-50 text-rose-700 border-rose-200/60",
    icon: ShieldAlert,
    label: "Error",
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const normalizedStatus = status?.toLowerCase() || "uploaded";
  const config = statusConfigs[normalizedStatus] || {
    color: "bg-slate-50 text-slate-700 border-slate-200/60",
    icon: AlertCircle,
    label: status,
  };

  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}
    >
      <IconComponent className={`w-3.5 h-3.5 ${normalizedStatus === "processing" ? "animate-spin" : ""}`} />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;

