import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/i18n';
import { Plus, ArrowDownRight, ArrowUpRight, Calendar, X } from 'lucide-react';

export function Transactions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'history' | 'recurring'>('history');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [formType, setFormType] = useState<'expense' | 'income' | 'recurring'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [nextDueDate, setNextDueDate] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [txRes, recRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user?.id).order('date', { ascending: false }),
        supabase.from('recurring_expenses').select('*').eq('user_id', user?.id).order('next_due_date', { ascending: true })
      ]);
      
      if (txRes.data) setTransactions(txRes.data);
      if (recRes.data) setRecurring(recRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      if (formType === 'recurring') {
        await supabase.from('recurring_expenses').insert({
          user_id: user.id,
          name: category, // Usamos category como nombre para simplificar
          amount: parseFloat(amount),
          frequency,
          next_due_date: nextDueDate
        });
      } else {
        await supabase.from('transactions').insert({
          user_id: user.id,
          amount: parseFloat(amount),
          type: formType,
          category: category || 'General',
          description
        });
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
    }
  }

  function resetForm() {
    setAmount('');
    setCategory('');
    setDescription('');
    setNextDueDate('');
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Movimientos</h1>
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'history' ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'
          }`}
        >
          Historial
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'recurring' ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'
          }`}
        >
          Gastos Fijos
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-500 py-10">Cargando...</div>
      ) : activeTab === 'history' ? (
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No hay movimientos registrados.</p>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{tx.category}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`font-bold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {recurring.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No tienes gastos fijos configurados.</p>
          ) : (
            recurring.map(rec => (
              <div key={rec.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{rec.name}</p>
                    <p className="text-xs text-gray-500">Próximo: {new Date(rec.next_due_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(rec.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center hover:bg-green-600 transition-transform active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      {/* Modal / Bottom Sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Registro</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <button onClick={() => setFormType('expense')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${formType === 'expense' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>Gasto</button>
              <button onClick={() => setFormType('income')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${formType === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>Ingreso</button>
              <button onClick={() => setFormType('recurring')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${formType === 'recurring' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>Gasto Fijo</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-xl font-bold" placeholder="0.00" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{formType === 'recurring' ? 'Nombre del Gasto' : 'Categoría'}</label>
                <input type="text" required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" placeholder={formType === 'recurring' ? 'Ej. Netflix' : 'Ej. Comida'} />
              </div>

              {formType === 'recurring' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frecuencia</label>
                    <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white">
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Próximo Pago</label>
                    <input type="date" required value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (Opcional)</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" placeholder="Detalles..." />
                </div>
              )}

              <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
