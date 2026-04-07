import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Settings, CreditCard } from 'lucide-react';

export function Profile() {
  const { user, signOut } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Perfil</h1>
      </header>

      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-2xl">
          {user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white text-lg">
            {user?.user_metadata?.full_name || 'Usuario Lumo'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <CreditCard size={20} className="text-gray-400" />
          <span className="font-medium">Moneda y Región</span>
        </button>
        <button className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Settings size={20} className="text-gray-400" />
          <span className="font-medium">Configuración</span>
        </button>
        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors mt-4"
        >
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
