// Root component with React Router and React Query provider.
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import InvoiceDetail from "./pages/InvoiceDetail";
import Disputes from "./pages/Disputes";
import Clients from "./pages/clients";
import Contracts from "./pages/contracts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/contracts" element={<Contracts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
