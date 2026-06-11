// Custom React Query hooks for all backend endpoints.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

// ---------- Clients ----------
export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients/").then((r) => r.data),
  });

// ---------- Invoices ----------
export const useInvoices = () =>
  useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get("/invoices/").then((r) => r.data),
  });

export const useInvoice = (id: number) =>
  useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
  });

export const useUploadInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/invoices/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
};

export const useProcessInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/process`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
};

export const useAuditInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/audit`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
};

// ---------- Line Items ----------
export const useLineItems = (invoiceId: number) =>
  useQuery({
    queryKey: ["lineItems", invoiceId],
    queryFn: () =>
      api.get(`/invoices/${invoiceId}/line-items`).then((r) => r.data),
  });

// ---------- Discrepancies ----------
export const useDiscrepancies = (invoiceId?: number) =>
  useQuery({
    queryKey: ["discrepancies", invoiceId],
    queryFn: () =>
      api
        .get("/discrepancies/", { params: { invoice_id: invoiceId } })
        .then((r) => r.data),
    enabled: !!invoiceId,
  });

// ---------- Disputes ----------
export const useDisputes = (invoiceId?: number) =>
  useQuery({
    queryKey: ["disputes", invoiceId],
    queryFn: () =>
      api
        .get("/disputes/", { params: { invoice_id: invoiceId } })
        .then((r) => r.data),
    enabled: !!invoiceId,
  });

export const useGenerateDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: number) =>
      api.post(`/invoices/${invoiceId}/generate-dispute`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });
};

export const useUpdateDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft_body }: { id: number; draft_body: string }) =>
      api.put(`/disputes/${id}`, { draft_body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });
};

export const useSendDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/disputes/${id}/send`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });
};

// ---------- Client Mutations ----------
export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      api.post("/clients/", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useUpdateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name: string;
      email: string;
    }) => api.put(`/clients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
};

// ---------- Contract Mutations ----------
export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/contracts/", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
};

export const useUpdateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/contracts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
};

export const useDeleteContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/contracts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
};

export const useContracts = () =>
  useQuery({
    queryKey: ["contracts"],
    queryFn: () => api.get("/contracts/").then((r) => r.data),
  });
