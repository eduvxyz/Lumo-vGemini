import { Outlet, NavLink } from 'react-router';
import { Home, ArrowLeftRight, Target, CreditCard, User } from 'lucide-react';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Mobile-First Container */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      
      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-2 flex justify-between px-4 pb-safe z-50">
        <NavItem to="/" icon={<Home size={22} />} label="Inicio" />
        <NavItem to="/transactions" icon={<ArrowLeftRight size={22} />} label="Movimientos" />
        <NavItem to="/debts" icon={<CreditCard size={22} />} label="Deudas" />
        <NavItem to="/goals" icon={<Target size={22} />} label="Metas" />
        <NavItem to="/profile" icon={<User size={22} />} label="Perfil" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center p-1 rounded-xl transition-colors ${
          isActive ? 'text-green-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`
      }
    >
      {icon}
      <span className="text-[9px] mt-1 font-medium">{label}</span>
    </NavLink>
  );
}
