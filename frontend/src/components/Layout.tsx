import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { Menu, PanelLeftClose, PanelLeftOpen, Bell, Database } from "lucide-react";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("invoiceguard_sidebar_open");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("invoiceguard_sidebar_open", String(next));
      } catch {
        // ignore localStorage errors if disabled
      }
      return next;
    });
  };

  // Get friendly name for current page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/invoices/")) return "Invoice Audit details";
    if (path.startsWith("/disputes")) return "Disputes Manager";
    if (path.startsWith("/clients")) return "Client Directory";
    if (path.startsWith("/contracts")) return "Contract Tariffs";
    return "InvoiceGuard AI";
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Navigation Sidebar */}
      <Navbar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area with smooth dynamic padding */}
      <div 
        className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? "lg:pl-64" : "lg:pl-0"
        }`}
      >
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
          {/* Left section: Toggle Sidebar & Title */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-5 h-5 hidden lg:block text-slate-600" />
              ) : (
                <PanelLeftOpen className="w-5 h-5 hidden lg:block text-indigo-600" />
              )}
              <Menu className="w-5 h-5 lg:hidden" />
            </button>

            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          {/* Right section: Global status, notification, user */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100/40 text-[10px] font-bold text-emerald-700">
              <Database className="w-3.5 h-3.5" />
              <span>API Connected</span>
            </div>

            <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <div className="w-px h-5 bg-slate-200" />

            <button className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                JD
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-700 leading-none">
                  Jackson
                </p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  Invoice Guard
                </p>
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto transition-all duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
