/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Transactions } from './pages/Transactions';
import { Goals } from './pages/Goals';
import { Debts } from './pages/Debts';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './lib/i18n'; // Inicializar i18n

// Componente para proteger rutas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-500">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="debts" element={<Debts />} />
            <Route path="goals" element={<Goals />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
