import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        // En Supabase, si requiere confirmación de email, avisaríamos aquí.
        // Por ahora asumimos auto-login o confirmación desactivada para dev.
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-green-500/30">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lumo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tu asistente financiero</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all dark:text-white"
                placeholder="Juan Pérez"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? t('loading') : (isSignUp ? t('sign_up') : t('sign_in'))}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            {isSignUp ? t('have_account') : t('no_account')}
          </button>
        </div>
      </div>
    </div>
  );
}
