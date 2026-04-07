import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/i18n';
import { Plus, CreditCard, X } from 'lucide-react';

export function Debts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states (New Debt)
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');

  // Form states (Payment)
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (user) {
      fetchDebts();
    }
  }, [user]);

  async function fetchDebts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setDebts(data);
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      await supabase.from('debts').insert({
        user_id: user.id,
        name,
        total_amount: parseFloat(totalAmount),
        remaining_amount: parseFloat(totalAmount),
        interest_rate: parseFloat(interestRate) || 0
      });

      setIsModalOpen(false);
      setName('');
      setTotalAmount('');
      setInterestRate('');
      fetchDebts();
    } catch (error) {
      console.error('Error saving debt:', error);
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedDebt) return;

    const amount = parseFloat(paymentAmount);

    try {
      // 1. Insert payment record
      await supabase.from('debt_payments').insert({
        debt_id: selectedDebt.id,
        user_id: user.id,
        amount: amount
      });

      // 2. Update debt remaining amount
      await supabase.from('debts').update({
        remaining_amount: selectedDebt.remaining_amount - amount
      }).eq('id', selectedDebt.id);

      // 3. Register as an expense transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: amount,
        type: 'expense',
        category: `Abono a ${selectedDebt.name}`,
        description: 'Abono voluntario a deuda'
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setSelectedDebt(null);
      fetchDebts();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Deudas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gestiona tus tarjetas y préstamos</p>
      </header>

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-500 py-10">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {debts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <CreditCard size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Libre de deudas</h3>
              <p className="text-sm text-gray-500 px-6">Agrega una tarjeta de crédito o préstamo para llevar el control de tus abonos.</p>
            </div>
          ) : (
            debts.map(debt => {
              const progress = Math.min(100, ((debt.total_amount - debt.remaining_amount) / debt.total_amount) * 100);
              return (
                <div key={debt.id} className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{debt.name}</h3>
                        <p className="text-xs text-gray-500">Interés: {debt.interest_rate}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Restante</span>
                      <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(debt.remaining_amount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-right text-gray-400">De {formatCurrency(debt.total_amount)}</p>
                  </div>

                  <button 
                    onClick={() => { setSelectedDebt(debt); setIsPaymentModalOpen(true); }}
                    disabled={debt.remaining_amount <= 0}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {debt.remaining_amount <= 0 ? 'Deuda Pagada 🎉' : 'Hacer Abono'}
                  </button>
                </div>
              );
            })
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

      {/* Modal - Nueva Deuda */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Deuda</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre (Ej. Tarjeta Visa)</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto Total Adeudado</label>
                <input type="number" step="0.01" required value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-xl font-bold" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tasa de Interés % (Opcional)</label>
                <input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" placeholder="0.00" />
              </div>

              <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6">
                Registrar Deuda
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Abono */}
      {isPaymentModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Abono a {selectedDebt.name}</h2>
              <button onClick={() => { setIsPaymentModalOpen(false); setSelectedDebt(null); }} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto a abonar</label>
                <input 
                  type="number" 
                  step="0.01" 
                  max={selectedDebt.remaining_amount}
                  required 
                  value={paymentAmount} 
                  onChange={e => setPaymentAmount(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-xl font-bold" 
                  placeholder="0.00" 
                />
                <p className="text-xs text-gray-500 mt-2">Restante: {formatCurrency(selectedDebt.remaining_amount)}</p>
              </div>

              <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6">
                Confirmar Abono
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
