// Wraps pages with Navbar and main content area
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = () => (
  <div className="min-h-screen">
    <Navbar />
    <main className="max-w-7xl mx-auto px-4">
      <Outlet />
    </main>
  </div>
);

export default Layout;
