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
  useQuery<any>({
    queryKey: ["invoices"],
    queryFn: () => api.get("/invoices/").then((r) => r.data),
    refetchInterval: (query) => {
      const list = query.state.data || [];
      const hasProcessing = list.some(
        (inv: any) => inv.status?.toLowerCase() === "processing"
      );
      return hasProcessing ? 2000 : false;
    },
  });

export const useInvoice = (id: number) =>
  useQuery<any>({
    queryKey: ["invoice", id],
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status?.toLowerCase();
      return status === "processing" ? 2000 : false;
    },
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
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["lineItems", id] });
    },
  });
};

export const useAuditInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/invoices/${id}/audit`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["discrepancies", id] });
    },
  });
};

export const useDeleteInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/invoices/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", id] });
    },
  });
};

// ---------- Line Items ----------
export const useLineItems = (invoiceId: number, options?: any) =>
  useQuery<any>({
    queryKey: ["lineItems", invoiceId],
    queryFn: () =>
      api.get(`/invoices/${invoiceId}/line-items`).then((r) => r.data),
    ...options,
  });

// ---------- Discrepancies ----------
export const useDiscrepancies = (invoiceId?: number, options?: any) =>
  useQuery<any>({
    queryKey: ["discrepancies", invoiceId],
    queryFn: () =>
      api
        .get("/discrepancies/", { params: { invoice_id: invoiceId } })
        .then((r) => r.data),
    enabled: !!invoiceId,
    ...options,
  });

// ---------- Disputes ----------
export const useDisputes = (invoiceId?: number, options?: any) =>
  useQuery<any>({
    queryKey: ["disputes", invoiceId],
    queryFn: () =>
      api
        .get("/disputes/", { params: { invoice_id: invoiceId } })
        .then((r) => r.data),
    enabled: !!invoiceId,
    ...options,
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
    mutationFn: (id: number) => api.post(`/disputes/${id}/send`).then((r) => r.data),
    onSuccess: (dispute) => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      qc.invalidateQueries({ queryKey: ["allDisputes"] });
      if (dispute?.invoice_id) {
        qc.invalidateQueries({ queryKey: ["invoice", dispute.invoice_id] });
        qc.invalidateQueries({ queryKey: ["invoices"] });
      }
    },
  });
};

export const useDisputeTimeline = (disputeId?: number) =>
  useQuery<any>({
    queryKey: ["disputeTimeline", disputeId],
    queryFn: () => api.get(`/disputes/${disputeId}/timeline`).then((r) => r.data),
    enabled: !!disputeId,
  });

export const useUpdateDisputeStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, new_status, note }: { id: number; new_status: string; note?: string }) =>
      api.post(`/disputes/${id}/status`, { new_status, note }).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      qc.invalidateQueries({ queryKey: ["allDisputes"] });
      qc.invalidateQueries({ queryKey: ["disputeTimeline", variables.id] });
    },
  });
};

export const useRecordCarrierResponse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      recovered_amount,
      response_date,
      carrier_response,
      rejection_reason,
      status,
      note,
    }: {
      id: number;
      recovered_amount?: number;
      response_date?: string;
      carrier_response?: string;
      rejection_reason?: string;
      status?: string;
      note?: string;
    }) =>
      api.post(`/disputes/${id}/record-response`, {
        recovered_amount,
        response_date,
        carrier_response,
        rejection_reason,
        status,
        note,
      }).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      qc.invalidateQueries({ queryKey: ["allDisputes"] });
      qc.invalidateQueries({ queryKey: ["disputeTimeline", variables.id] });
    },
  });
};

export const useEscalateDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      api.post(`/disputes/${id}/escalate`, { note }).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      qc.invalidateQueries({ queryKey: ["allDisputes"] });
      qc.invalidateQueries({ queryKey: ["disputeTimeline", variables.id] });
    },
  });
};

export const useScheduleFollowUp = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, follow_up_date, note }: { id: number; follow_up_date: string; note?: string }) =>
      api.post(`/disputes/${id}/follow-up`, { follow_up_date, note }).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      qc.invalidateQueries({ queryKey: ["allDisputes"] });
      qc.invalidateQueries({ queryKey: ["disputeTimeline", variables.id] });
    },
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
