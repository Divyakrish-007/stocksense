import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Package,
  LayoutDashboard,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Settings,
  UserCheck,
  LogOut,
  X,
  ShieldCheck,
  Warehouse,
  ShoppingBag,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('info', 'Logged Out', 'You have been signed out of StockSense.');
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Products', path: '/products', icon: Boxes },
    { label: 'Receipts', path: '/receipts', icon: ArrowDownLeft },
    { label: 'Delivery Orders', path: '/delivery-orders', icon: ArrowUpRight },
    { label: 'Internal Transfers', path: '/internal-transfers', icon: ArrowLeftRight },
    { label: 'Inventory Adjustments', path: '/inventory-adjustments', icon: SlidersHorizontal },
    { label: 'Suppliers', path: '/suppliers', icon: Package },
    { label: 'Purchase Orders', path: '/purchase-orders', icon: Package },
    { label: 'Sales Orders', path: '/sales-orders', icon: ShoppingBag },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Move History', path: '/move-history', icon: History },
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'My Profile', path: '/profile', icon: UserCheck },
  ];

  return (
    <>
      {/* Mobile / Tablet Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">StockSense</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Modular Inventory</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Operations & Management
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isDashboard = item.path === '/dashboard';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {!isDashboard && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        Phase 2
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Account
          </div>

          {/* Logout Button in Menu */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors group"
          >
            <LogOut className="w-4 h-4 shrink-0 text-rose-400 group-hover:scale-110 transition-transform" />
            <span>Logout</span>
          </button>
        </nav>

        {/* User Profile Mini Footer */}
        {user && (
          <div className="p-3 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[10px] text-slate-300 truncate">{user.role}</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
