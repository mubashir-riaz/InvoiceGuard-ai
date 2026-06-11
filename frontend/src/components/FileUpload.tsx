import { useState, useRef, DragEvent, useEffect } from "react";
import { useUploadInvoice, useClients, useContracts } from "../hooks/useApi";
import { 
  FileText, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  Hash, 
  Tag, 
  DollarSign, 
  X,
  User,
  Briefcase
} from "lucide-react";

const FileUpload = ({
  onClose,
}: {
  onClose?: () => void;
}) => {
  const { data: clients } = useClients();
  const { data: contracts } = useContracts();

  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState(false);
  
  const upload = useUploadInvoice();
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-select first client if available
  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(String(clients[0].id));
    }
  }, [clients, selectedClientId]);

  // Auto-select first contract for the selected client if available
  const filteredContracts = contracts?.filter((c: any) => c.client_id === Number(selectedClientId)) || [];
  useEffect(() => {
    if (filteredContracts.length > 0) {
      setSelectedContractId(String(filteredContracts[0].id));
    } else {
      setSelectedContractId("");
    }
  }, [selectedClientId, contracts]);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedClientId || !selectedContractId) return;
    
    const fd = new FormData();
    fd.append("client_id", selectedClientId);
    fd.append("contract_id", selectedContractId);
    fd.append("invoice_number", invoiceNumber);
    fd.append("carrier", carrier);
    fd.append("invoice_date", invoiceDate);
    fd.append("total_amount", totalAmount);
    fd.append("file", file);

    upload.mutate(fd, {
      onSuccess: () => {
        // Reset form
        setFile(null);
        setInvoiceNumber("");
        setCarrier("");
        setInvoiceDate("");
        setTotalAmount("");
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-xl max-w-2xl mx-auto relative overflow-hidden"
    >
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-full p-1.5 hover:bg-slate-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div>
        <h3 className="text-xl font-bold text-slate-800">Upload Invoice</h3>
        <p className="text-sm text-slate-500 mt-1">Upload a carrier invoice PDF and enter key details to audit.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Client Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" /> Client
          </label>
          <select
            className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 outline-none"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            required
          >
            {clients?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {(!clients || clients.length === 0) && (
              <option value="">No Clients Found</option>
            )}
          </select>
        </div>

        {/* Contract Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Active Contract
          </label>
          <select
            className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-semibold text-slate-800 outline-none"
            value={selectedContractId}
            onChange={(e) => setSelectedContractId(e.target.value)}
            required
          >
            {filteredContracts.map((c: any) => (
              <option key={c.id} value={c.id}>
                ID #{c.id} - {c.carrier} Contract
              </option>
            ))}
            {filteredContracts.length === 0 && (
              <option value="">No Active Contracts Found</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-400" /> Invoice Number
          </label>
          <input
            className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
            placeholder="INV-2026-904"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" /> Carrier Name
          </label>
          <input
            className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
            placeholder="FedEx / DHL / UPS"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Invoice Date
          </label>
          <input
            className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-medium text-slate-800 outline-none"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-400" /> Total Amount ($)
          </label>
          <input
            className="w-full border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors p-3 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
            type="number"
            step="0.01"
            placeholder="1250.00"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50/30 ring-4 ring-indigo-50"
            : file
            ? "border-emerald-300 bg-emerald-50/10 hover:bg-emerald-50/20"
            : "border-slate-200 bg-slate-50/20 hover:border-indigo-400 hover:bg-slate-50/50"
        }`}
      >
        <input
          type="file"
          accept="application/pdf"
          ref={fileRef}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        {file ? (
          <>
            <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 border border-emerald-100">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB • PDF File</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="text-xs text-rose-500 font-semibold hover:underline mt-1"
            >
              Remove file
            </button>
          </>
        ) : (
          <>
            <div className="rounded-full bg-slate-50 p-4 text-slate-400 border border-slate-100">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Drag & drop your invoice PDF here</p>
              <p className="text-xs text-slate-400 mt-1">or click to browse from files</p>
            </div>
          </>
        )}
      </div>

      {upload.isError && (
        <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Upload failed. Please check your network and invoice details.</span>
        </div>
      )}

      {upload.isSuccess && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs text-emerald-700 font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Upload successful! The invoice is now ready for processing.</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={upload.isPending || !file || !selectedClientId || !selectedContractId}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {upload.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4.5 w-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            "Upload Invoice"
          )}
        </button>
      </div>
    </form>
  );
};

export default FileUpload;
