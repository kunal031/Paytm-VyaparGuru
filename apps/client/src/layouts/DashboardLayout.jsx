import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: '🏠' },
  { to: '/cashflow', label: 'Cash Flow', icon: '💰' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/sales', label: 'Copilot', icon: '💬' },
];

function NavItems({ vertical = false }) {
  return navItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
          vertical ? 'px-4 py-2.5' : 'flex-1 flex-col gap-0.5 py-2 text-xs'
        } ${
          isActive
            ? 'bg-brand-sky text-brand-navy'
            : 'text-slate-600 hover:bg-slate-100 hover:text-brand-navy'
        }`
      }
    >
      <span aria-hidden>{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  ));
}

export default function DashboardLayout() {
  const merchant = useAuthStore((s) => s.merchant);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-brand-navy px-2 py-1 text-sm font-extrabold text-white">Vy</span>
          <div>
            <h1 className="text-base font-bold leading-tight text-brand-navy">VyaparGuru</h1>
            <p className="hidden text-xs text-slate-500 sm:block">{merchant?.businessName}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Logout
        </button>
      </header>

      <div className="flex">
        {/* Sidebar — hidden on mobile */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3 md:flex">
          <NavItems vertical />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 pb-20 sm:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white px-2 py-1 md:hidden">
        <NavItems />
      </nav>
    </div>
  );
}
