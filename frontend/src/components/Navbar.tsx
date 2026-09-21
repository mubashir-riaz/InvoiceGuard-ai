import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Scale, 
  Users, 
  FileSignature, 
  Truck, 
  X,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Navbar = ({ isOpen, onClose }: SidebarProps) => {
  const { pathname } = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/clients", label: "Clients", icon: Users },
    { path: "/contracts", label: "Contracts", icon: FileSignature },
    { path: "/disputes", label: "Disputes", icon: Scale },
  ];

  const getLinkClass = (path: string) => {
    const isActive = pathname === path || (path !== "/" && pathname.startsWith(path));
    return `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive 
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;
  };

  return (
    <>
      {/* Backdrop Overlay - Floats over entire screen when open without moving page content */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Floating Overlay Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-white border-r border-slate-100 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo/Brand Header with Close Toggle Button */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-100">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-base leading-none block">InvoiceGuard</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5 block">AI Auditor</span>
            </div>
          </Link>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Close menu"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={getLinkClass(item.path)}
                onClick={onClose}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Banner / Status */}
        <div className="p-4 border-t border-slate-100 m-4 rounded-2xl bg-indigo-50/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white text-indigo-600 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Security Mode</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Contracts and audits are fully locked & verified.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;

