import React, { useState } from "react";
import { getInvoicePdfUrl } from "../hooks/useApi";
import { 
  FileText, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Maximize2, 
  Minimize2 
} from "lucide-react";

interface PdfViewerProps {
  invoiceId: number;
  invoiceNumber?: string;
  className?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  invoiceId,
  invoiceNumber,
  className = "",
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const pdfUrl = getInvoicePdfUrl(invoiceId);

  const handleReload = () => {
    setIsLoading(true);
    setHasError(false);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden ${className}`}>
      
      {/* Viewer Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate">
              Original Invoice PDF
            </h4>
            {invoiceNumber && (
              <p className="text-[10px] text-slate-400 font-semibold truncate">
                #{invoiceNumber}
              </p>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Reload / Refresh */}
          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Reload PDF preview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {/* Download PDF */}
          <a
            href={pdfUrl}
            download={`invoice_${invoiceNumber || invoiceId}.pdf`}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Download PDF file"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          {/* Open in New Tab Button */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 border border-slate-200 rounded-lg shadow-2xs transition-all"
            title="Open PDF in new browser tab"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Optional Expand/Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
              title={isFullscreen ? "Exit split fullscreen" : "Expand viewer"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Embedded PDF Frame Container */}
      <div className="relative flex-1 min-h-[520px] bg-slate-100 flex flex-col">
        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50/80 z-10 backdrop-blur-2xs">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-500">Loading PDF document...</span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white space-y-3">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-slate-800">Unable to preview PDF document</h5>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                The file could not be rendered in this window. You can open it directly in a new tab or verify server storage.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReload}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Try Again
              </button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={reloadKey}
            src={pdfUrl}
            title={`Invoice #${invoiceNumber || invoiceId} PDF Preview`}
            className="w-full flex-1 border-0 min-h-[550px] lg:min-h-[650px]"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>

    </div>
  );
};

export default PdfViewer;
