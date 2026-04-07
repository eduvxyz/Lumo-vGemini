import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useSafeToSpend } from '../hooks/useSafeToSpend';
import { ArrowUpRight, ArrowDownRight, Calendar, Sparkles } from 'lucide-react';

export function Dashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { safeToSpend, loading: safeLoading } = useSafeToSpend();
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulador states
  const [simAmount, setSimAmount] = useState('');
  const [simResult, setSimResult] = useState<'idle' | 'green' | 'red'>('idle');

  useEffect(() => {
    async function fetchRecent() {
      if (!user) return;
      try {
        const { data: recentTx } = await supabase
          .from('transactions')
          .select('id, amount, type, category, date')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(3);

        const { data: recentRec } = await supabase
          .from('recurring_expenses')
          .select('id, amount, name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        const combined = [
          ...(recentTx || []).map(tx => ({ ...tx, isRecurring: false })),
          ...(recentRec || []).map(rec => ({
            id: rec.id,
            amount: rec.amount,
            type: 'recurring',
            category: rec.name,
            date: rec.created_at.split('T')[0],
            isRecurring: true
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
          
        setRecentTransactions(combined);
      } catch (error) {
        console.error("Error fetching recent:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, [user]);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(simAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    if (amount <= safeToSpend) {
      setSimResult('green');
    } else {
      setSimResult('red');
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Usuario';
  const userCurrency = profile?.currency || 'USD';

  return (
    <div className="p-6 space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('welcome', { name: firstName })}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {safeLoading ? t('calculating') : 'Tu resumen financiero'}
          </p>
        </div>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-green-500" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
      </header>

      <section className="bg-gray-900 dark:bg-gray-800 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <h2 className="text-sm font-medium text-gray-300 mb-2">{t('safe_to_spend')}</h2>
        <div className={`text-4xl font-bold mb-1 ${safeToSpend < 0 ? 'text-red-400' : ''}`}>
          {formatCurrency(safeToSpend, userCurrency)}
        </div>
        <p className="text-xs text-gray-400">
          {safeToSpend < 0 ? '⚠️ Estás en negativo. Revisa tus gastos fijos.' : 'Disponible hasta fin de mes'}
        </p>
        
        <div className="mt-6 flex gap-3 relative z-10">
          <button 
            onClick={() => navigate('/transactions')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={16} /> Ingreso
          </button>
          <button 
            onClick={() => navigate('/transactions')}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownRight size={16} /> Gasto
          </button>
        </div>
      </section>

      {/* Simulador Luz Verde */}
      <section className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-yellow-500" size={20} />
          <h3 className="font-semibold text-gray-900 dark:text-white">Simulador "Luz Verde"</h3>
        </div>
        <form onSubmit={handleSimulate} className="flex gap-2">
          <input 
            type="number" 
            placeholder="¿Cuánto quieres gastar?" 
            value={simAmount}
            onChange={(e) => { setSimAmount(e.target.value); setSimResult('idle'); }}
            className="flex-1 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none dark:text-white text-sm"
          />
          <button type="submit" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-sm font-medium">
            Simular
          </button>
        </form>
        {simResult !== 'idle' && (
          <div className={`mt-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            simResult === 'green' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${simResult === 'green' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
            {simResult === 'green' 
              ? '¡Luz Verde! Puedes comprarlo sin afectar tus gastos fijos.' 
              : 'Luz Roja. Esta compra superaría tu Dinero Libre actual.'}
          </div>
        )}
      </section>
      
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Actividad Reciente</h3>
          <button onClick={() => navigate('/transactions')} className="text-sm text-green-500 font-medium">Ver todo</button>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-gray-500 text-sm">Cargando...</div>
          ) : recentTransactions.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 text-center text-gray-500 text-sm">
              No hay movimientos aún.
            </div>
          ) : (
            recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 
                    tx.type === 'recurring' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {tx.type === 'income' ? <ArrowUpRight size={20} /> : 
                     tx.type === 'recurring' ? <Calendar size={20} /> : 
                     <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {tx.category} {tx.type === 'recurring' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-1">Fijo</span>}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`font-bold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, userCurrency)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
