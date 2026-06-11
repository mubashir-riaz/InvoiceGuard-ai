// Full CRUD page for contracts. Select a client when creating.
import { useState } from "react";
import {
  useContracts,
  useClients,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
} from "../hooks/useApi";
import DataTable from "../components/DataTable";

const Contracts = () => {
  const { data: contracts, isLoading } = useContracts();
  const { data: clients } = useClients();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const [form, setForm] = useState({
    client_id: 0,
    carrier: "",
    rate_details: '{"base_rate":0,"per_kg":0}',
    effective_start: "",
    effective_end: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      client_id: Number(form.client_id),
      rate_details: JSON.parse(form.rate_details),
    };
    if (editingId) {
      updateContract.mutate({ id: editingId, ...payload });
      setEditingId(null);
    } else {
      createContract.mutate(payload);
    }
    setForm({
      client_id: 0,
      carrier: "",
      rate_details: '{"base_rate":0,"per_kg":0}',
      effective_start: "",
      effective_end: "",
    });
  };

  const editContract = (contract: any) => {
    setForm({
      client_id: contract.client_id,
      carrier: contract.carrier,
      rate_details: JSON.stringify(contract.rate_details),
      effective_start: contract.effective_start,
      effective_end: contract.effective_end,
    });
    setEditingId(contract.id);
  };

  const columns = [
    { header: "ID", accessor: "id" as const },
    { header: "Client ID", accessor: "client_id" as const },
    { header: "Carrier", accessor: "carrier" as const },
    {
      header: "Base Rate",
      accessor: (row: any) => `$${row.rate_details.base_rate}`,
    },
    { header: "Per Kg", accessor: (row: any) => `$${row.rate_details.per_kg}` },
    { header: "Valid From", accessor: "effective_start" as const },
    { header: "Valid To", accessor: "effective_end" as const },
    {
      header: "Actions",
      accessor: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => editContract(row)}
            className="text-blue-600 text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => deleteContract.mutate(row.id)}
            className="text-red-600 text-xs"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Contracts</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 items-end"
      >
        <div>
          <label className="block text-sm mb-1">Client</label>
          <select
            className="border p-2 rounded w-full"
            value={form.client_id}
            onChange={(e) =>
              setForm({ ...form, client_id: parseInt(e.target.value) })
            }
            required
          >
            <option value={0}>-- Select --</option>
            {clients?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Carrier</label>
          <input
            className="border p-2 rounded w-full"
            value={form.carrier}
            onChange={(e) => setForm({ ...form, carrier: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Rate Details (JSON)</label>
          <input
            className="border p-2 rounded w-full"
            value={form.rate_details}
            onChange={(e) => setForm({ ...form, rate_details: e.target.value })}
            required
          />
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-sm mb-1">Start Date</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={form.effective_start}
              onChange={(e) =>
                setForm({ ...form, effective_start: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">End Date</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              value={form.effective_end}
              onChange={(e) =>
                setForm({ ...form, effective_end: e.target.value })
              }
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editingId ? "Update" : "Create"}
        </button>
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setForm({
                client_id: 0,
                carrier: "",
                rate_details: '{"base_rate":0,"per_kg":0}',
                effective_start: "",
                effective_end: "",
              });
            }}
            className="text-gray-500 py-2"
          >
            Cancel
          </button>
        )}
      </form>
      <DataTable columns={columns} data={contracts || []} />
    </div>
  );
};

export default Contracts;
