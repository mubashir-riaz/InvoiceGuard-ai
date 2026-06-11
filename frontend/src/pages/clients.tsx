// Full CRUD page for managing clients.
import { useState } from "react";
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from "../hooks/useApi";
import DataTable from "../components/DataTable";

const Clients = () => {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [form, setForm] = useState({ name: "", email: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateClient.mutate({ id: editingId, ...form });
      setEditingId(null);
    } else {
      createClient.mutate(form);
    }
    setForm({ name: "", email: "" });
  };

  const editClient = (client: any) => {
    setForm({ name: client.name, email: client.email });
    setEditingId(client.id);
  };

  const columns = [
    { header: "ID", accessor: "id" as const },
    { header: "Name", accessor: "name" as const },
    { header: "Email", accessor: "email" as const },
    {
      header: "Actions",
      accessor: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => editClient(row)}
            className="text-blue-600 text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => deleteClient.mutate(row.id)}
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
      <h2 className="text-2xl font-bold mb-4">Clients</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow mb-6 flex gap-4 items-end"
      >
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            className="border p-2 rounded"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className="border p-2 rounded"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
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
              setForm({ name: "", email: "" });
            }}
            className="text-gray-500 py-2"
          >
            Cancel
          </button>
        )}
      </form>
      <DataTable columns={columns} data={clients || []} />
    </div>
  );
};

export default Clients;
