import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/i18n';
import { Plus, Target, Users, X, ChevronLeft, Share2, DollarSign } from 'lucide-react';

export function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Goal Details States
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');

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

  async function fetchGoalDetails(goal: any) {
    setSelectedGoal(goal);
    try {
      // Fetch participants
      const { data: parts } = await supabase
        .from('goal_participants')
        .select('role, user_id')
        .eq('goal_id', goal.id);
      
      if (parts) setParticipants(parts);

      // Fetch contributions
      const { data: contribs } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goal.id)
        .order('date', { ascending: false });
        
      if (contribs) setContributions(contribs);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.from('saving_goals').insert({
        creator_id: user.id,
        name,
        target_amount: parseFloat(targetAmount),
        deadline: deadline || null
      }).select().single();

      if (error) throw error;

      if (data) {
        await supabase.from('goal_participants').insert({
          goal_id: data.id,
          user_id: user.id,
          role: 'admin'
        });
      }

      setIsModalOpen(false);
      resetForm();
      fetchGoals();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      setErrorMsg(error.message || 'Ocurrió un error al crear la meta.');
    }
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedGoal) return;

    const amount = parseFloat(contributionAmount);

    try {
      // 1. Registrar contribución
      await supabase.from('goal_contributions').insert({
        goal_id: selectedGoal.id,
        user_id: user.id,
        amount: amount
      });

      // 2. Registrar como gasto para que afecte el Dinero Libre
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: amount,
        type: 'expense',
        category: `Aporte a ${selectedGoal.name}`,
        description: 'Aporte a meta de ahorro'
      });

      setIsContributeModalOpen(false);
      setContributionAmount('');
      
      // Refrescar datos
      fetchGoals();
      fetchGoalDetails({
        ...selectedGoal,
        current_amount: selectedGoal.current_amount + amount
      });
    } catch (error) {
      console.error('Error contributing:', error);
    }
  }

  function resetForm() {
    setName('');
    setTargetAmount('');
    setDeadline('');
    setErrorMsg(null);
  }

  function handleInvite() {
    // En un entorno real, esto generaría un Deep Link o abriría el Share API nativo
    alert(`¡Enlace de invitación copiado!\n\nEnvía esto a tus amigos para que se unan a "${selectedGoal?.name}".`);
  }

  // --- VISTA DE DETALLES DE LA META ---
  if (selectedGoal) {
    const progress = Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100);
    
    return (
      <div className="p-6 space-y-6 pb-24 animate-in slide-in-from-right-8">
        <header className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedGoal(null)}
            className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <ChevronLeft size={24} className="text-gray-900 dark:text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{selectedGoal.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Meta compartida</p>
          </div>
        </header>

        <section className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ahorrado</p>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(selectedGoal.current_amount)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Objetivo</p>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(selectedGoal.target_amount)}
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden mb-2">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all duration-1000 ease-out relative" 
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <p className="text-right text-xs font-bold text-green-600 dark:text-green-400">{progress.toFixed(1)}% completado</p>

          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => setIsContributeModalOpen(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-md shadow-green-500/20"
            >
              <DollarSign size={18} /> Aportar
            </button>
            <button 
              onClick={handleInvite}
              className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Share2 size={18} /> Invitar
            </button>
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-gray-400" /> Participantes ({participants.length})
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {participants.map((p, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[70px]">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-xl border-2 border-white dark:border-gray-950 shadow-sm">
                  {p.role === 'admin' ? '👑' : '👤'}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {p.user_id === user?.id ? 'Tú' : 'Amigo'}
                </span>
              </div>
            ))}
            <button onClick={handleInvite} className="flex flex-col items-center gap-1 min-w-[70px]">
              <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-green-500 hover:border-green-500 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-xs font-medium text-gray-500">Añadir</span>
            </button>
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Aportes Recientes</h3>
          <div className="space-y-3">
            {contributions.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Nadie ha aportado aún. ¡Sé el primero!</p>
            ) : (
              contributions.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {c.user_id === user?.id ? 'Tú' : 'Participante'}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(c.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    +{formatCurrency(c.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Modal Aporte */}
        {isContributeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hacer un Aporte</h2>
                <button onClick={() => setIsContributeModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleContribute} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto a aportar</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={contributionAmount} 
                    onChange={e => setContributionAmount(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-xl font-bold" 
                    placeholder="0.00" 
                  />
                  <p className="text-xs text-gray-500 mt-2">Este monto se descontará de tu Dinero Libre.</p>
                </div>

                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6">
                  Confirmar Aporte
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA PRINCIPAL (LISTA DE METAS) ---
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
                <div 
                  key={goal.id} 
                  onClick={() => fetchGoalDetails(goal)}
                  className="p-5 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden cursor-pointer hover:border-green-500 dark:hover:border-green-500 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-green-500 transition-colors">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-xs text-gray-500">Para: {new Date(goal.deadline).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                      <Users size={12} /> 1+
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

      {/* Modal Nueva Meta */}
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
