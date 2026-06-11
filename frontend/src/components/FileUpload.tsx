// Drag-and-drop area + form to upload a new invoice PDF.
import { useState, useRef } from "react";
import { useUploadInvoice } from "../hooks/useApi";

const FileUpload = ({
  clientId,
  contractId,
}: {
  clientId: number;
  contractId: number;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const upload = useUploadInvoice();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("client_id", String(clientId));
    fd.append("contract_id", String(contractId));
    fd.append("invoice_number", invoiceNumber);
    fd.append("carrier", carrier);
    fd.append("invoice_date", invoiceDate);
    fd.append("total_amount", totalAmount);
    fd.append("file", file);
    upload.mutate(fd);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-lg shadow space-y-4"
    >
      <h3 className="text-lg font-semibold">Upload New Invoice</h3>
      <div className="grid grid-cols-2 gap-4">
        <input
          className="border p-2 rounded"
          placeholder="Invoice Number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          placeholder="Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          type="date"
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          type="number"
          step="0.01"
          placeholder="Total Amount"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          required
        />
      </div>
      <div
        className="border-2 border-dashed p-6 text-center cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        {file ? file.name : "Click to select PDF file"}
        <input
          type="file"
          accept="application/pdf"
          ref={fileRef}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      <button
        type="submit"
        disabled={upload.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {upload.isPending ? "Uploading..." : "Upload"}
      </button>
      {upload.isError && <p className="text-red-500">Upload failed</p>}
      {upload.isSuccess && <p className="text-green-600">Upload successful!</p>}
    </form>
  );
};

export default FileUpload;
