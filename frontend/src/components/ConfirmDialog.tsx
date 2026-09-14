import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X, RefreshCw } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  // Listen for Escape key to cancel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in"
      onClick={() => {
        if (!isLoading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-xl relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-50 transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dialog Header with Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl border ${
              isDestructive
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : "bg-indigo-50 text-indigo-600 border-indigo-100"
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-slate-800">
              {title}
            </h3>
            <p className="text-xs text-slate-400">
              {isDestructive ? "This action cannot be undone." : "Please confirm your action."}
            </p>
          </div>
        </div>

        {/* Dialog Message */}
        <div className="text-sm text-slate-600 leading-relaxed">
          {message}
        </div>

        {/* Dialog Footer Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 text-white ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
