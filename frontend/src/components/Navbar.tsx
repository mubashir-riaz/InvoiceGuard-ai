// Top navigation bar with links.
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const { pathname } = useLocation();
  const linkClass = (path: string) =>
    `px-3 py-2 rounded ${pathname === path ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-200"}`;

  return (
    <nav className="bg-white shadow mb-6">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        <h1 className="font-bold text-xl mr-6">🚚 InvoiceGuard AI</h1>
        <Link to="/" className={linkClass("/")}>
          Dashboard
        </Link>
        <Link to="/disputes" className={linkClass("/disputes")}>
          Disputes
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
