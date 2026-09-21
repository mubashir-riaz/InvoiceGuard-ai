import React from "react";
import { Calendar, AlertCircle, Clock } from "lucide-react";

interface FollowUpBadgeProps {
  followUpDate?: string | null;
  className?: string;
  showIcon?: boolean;
}

export const FollowUpBadge: React.FC<FollowUpBadgeProps> = ({
  followUpDate,
  className = "",
  showIcon = true,
}) => {
  if (!followUpDate) return null;

  // Parse dates at local midnight
  const target = new Date(followUpDate);
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let label = "";
  let colorStyles = "";
  let Icon = Calendar;

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    label = `Follow-up overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
    colorStyles = "bg-rose-50 text-rose-700 border-rose-200/80";
    Icon = AlertCircle;
  } else if (diffDays === 0) {
    label = "Follow-up due today";
    colorStyles = "bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse";
    Icon = Clock;
  } else if (diffDays === 1) {
    label = "Follow-up due tomorrow";
    colorStyles = "bg-amber-50 text-amber-700 border-amber-200/80";
    Icon = Clock;
  } else {
    label = `Follow-up due in ${diffDays} days`;
    colorStyles = "bg-blue-50 text-blue-700 border-blue-200/80";
    Icon = Calendar;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorStyles} ${className}`}
      title={`Follow-up date: ${target.toLocaleDateString()}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{label}</span>
    </span>
  );
};

export default FollowUpBadge;
