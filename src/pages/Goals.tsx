import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/i18n';
import { Plus, Target, Users, X } from 'lucide-react';

export function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  async function fetchGoals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saving_goals')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    try {
      // 1. Crear la meta
      const { data, error } = await supabase.from('saving_goals').insert({
        creator_id: user.id,
        name,
        target_amount: parseFloat(targetAmount),
        deadline: deadline || null
      }).select().single();

      if (error) throw error;

      // 2. Agregar al creador como participante admin
      if (data) {
        const { error: participantError } = await supabase.from('goal_participants').insert({
          goal_id: data.id,
          user_id: user.id,
          role: 'admin'
        });
        
        if (participantError) {
          console.error("Error adding participant:", participantError);
          // No lanzamos el error para no bloquear la UI si la meta ya se creó, 
          // pero lo mostramos en consola. El parche SQL lo solucionará.
        }
      }

      setIsModalOpen(false);
      resetForm();
      fetchGoals();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      setErrorMsg(error.message || 'Ocurrió un error al crear la meta.');
    }
  }

  function resetForm() {
    setName('');
    setTargetAmount('');
    setDeadline('');
    setErrorMsg(null);
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Metas de Ahorro</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Ahorra solo o con amigos</p>
      </header>

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-500 py-10">Cargando...</div>
      ) : (
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <Target size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tienes metas aún</h3>
              <p className="text-sm text-gray-500 px-6">Crea una meta para empezar a ahorrar para ese viaje o compra especial.</p>
            </div>
          ) : (
            goals.map(goal => {
              const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
              return (
                <div key={goal.id} className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-xs text-gray-500">Para: {new Date(goal.deadline).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Users size={12} /> 1
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(goal.current_amount)}</span>
                      <span className="text-gray-500">de {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Meta</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={24} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la meta</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" placeholder="Ej. Viaje a Cancún" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto Objetivo</label>
                <input type="number" step="0.01" required value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-xl font-bold" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Límite (Opcional)</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" />
              </div>

              <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6">
                Crear Meta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
