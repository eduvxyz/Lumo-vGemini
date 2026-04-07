import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/i18n';
import { useSafeToSpend } from '../hooks/useSafeToSpend';
import { Plus, Target, Users, X, ChevronLeft, Share2, DollarSign, Edit2 } from 'lucide-react';

export function Goals() {
  const { user, profile } = useAuth();
  const { safeToSpend } = useSafeToSpend();
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
  
  // Edit Goal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetAmount, setEditTargetAmount] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [goalCurrency, setGoalCurrency] = useState('USD');
  const [isShared, setIsShared] = useState(false);
  const [avgMonthlyIncome, setAvgMonthlyIncome] = useState(0);

  useEffect(() => {
    if (profile?.currency) {
      setGoalCurrency(profile.currency);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchIncomeTrend();
    }
  }, [user]);

  async function fetchIncomeTrend() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, date')
        .eq('user_id', user?.id)
        .eq('type', 'income');
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const totalIncome = data.reduce((sum, t) => sum + t.amount, 0);
        const dates = data.map(t => new Date(t.date).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates, new Date().getTime());
        const monthsDiff = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 30.44));
        setAvgMonthlyIncome(totalIncome / monthsDiff);
      }
    } catch (error) {
      console.error('Error fetching income trend:', error);
    }
  }

  async function fetchGoals() {
    setLoading(true);
    try {
      // Fetch goals where user is participant
      const { data: participantGoals, error: pError } = await supabase
        .from('goal_participants')
        .select('goal_id')
        .eq('user_id', user?.id);
        
      if (pError) throw pError;
      
      const goalIds = participantGoals?.map(pg => pg.goal_id) || [];
      
      if (goalIds.length > 0) {
        const { data, error } = await supabase
          .from('saving_goals')
          .select('*')
          .in('id', goalIds)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        if (data) setGoals(data);
      } else {
        setGoals([]);
      }
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
        deadline: deadline || null,
        currency: goalCurrency,
        is_shared: isShared
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

  async function handleEditGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGoal) return;
    
    try {
      const newAmount = parseFloat(editTargetAmount);
      const { error } = await supabase
        .from('saving_goals')
        .update({ target_amount: newAmount })
        .eq('id', selectedGoal.id);
        
      if (error) throw error;
      
      setIsEditModalOpen(false);
      const updatedGoal = { ...selectedGoal, target_amount: newAmount };
      setSelectedGoal(updatedGoal);
      fetchGoals();
    } catch (error) {
      console.error("Error editing goal:", error);
    }
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedGoal) return;

    const amount = parseFloat(contributionAmount);

    try {
      await supabase.from('goal_contributions').insert({
        goal_id: selectedGoal.id,
        user_id: user.id,
        amount: amount
      });

      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: amount,
        type: 'expense',
        category: `Aporte a ${selectedGoal.name}`,
        description: 'Aporte a meta de ahorro'
      });

      setIsContributeModalOpen(false);
      setContributionAmount('');
      
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
    setGoalCurrency(profile?.currency || 'USD');
    setIsShared(false);
    setErrorMsg(null);
  }

  function handleInvite() {
    const inviteLink = `${window.location.origin}/join/${selectedGoal?.id}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert(`¡Enlace de invitación copiado!\n\n${inviteLink}\n\nEnvía esto a tus amigos para que se unan a "${selectedGoal?.name}".`);
    }).catch(() => {
      alert(`Comparte este enlace: ${inviteLink}`);
    });
  }

  // --- VISTA DE DETALLES DE LA META ---
  if (selectedGoal) {
    const progress = Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100);
    const goalCurrency = selectedGoal.currency || 'USD';
    const isAdmin = participants.find(p => p.user_id === user?.id)?.role === 'admin';
    const remainingAmount = Math.max(0, selectedGoal.target_amount - selectedGoal.current_amount);
    
    let timeInfo = null;
    if (selectedGoal.deadline && remainingAmount > 0) {
      const today = new Date();
      const deadlineDate = new Date(selectedGoal.deadline);
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        const monthsLeft = diffDays / 30.44;
        const weeksLeft = diffDays / 7;
        timeInfo = {
          monthly: remainingAmount / Math.max(1, monthsLeft),
          weekly: remainingAmount / Math.max(1, weeksLeft),
          days: diffDays
        };
      }
    }

    const suggestedMonthly = avgMonthlyIncome * 0.15; // Suggest 15% of avg income
    
    return (
      <div className="p-6 space-y-6 pb-24 animate-in slide-in-from-right-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedGoal(null)}
              className="w-10 h-10 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800"
            >
              <ChevronLeft size={24} className="text-gray-900 dark:text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{selectedGoal.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedGoal.is_shared ? 'Meta compartida' : 'Meta personal'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button 
              onClick={() => { setEditTargetAmount(selectedGoal.target_amount.toString()); setIsEditModalOpen(true); }}
              className="p-2 text-gray-500 hover:text-green-500 transition-colors"
            >
              <Edit2 size={20} />
            </button>
          )}
        </header>

        <section className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ahorrado</p>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(selectedGoal.current_amount, goalCurrency)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Objetivo</p>
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(selectedGoal.target_amount, goalCurrency)}
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
          <p className="text-right text-xs font-bold text-green-600 dark:text-green-400 mb-6">{progress.toFixed(1)}% completado</p>

          {remainingAmount > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Plan de Ahorro</h4>
              
              {timeInfo ? (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Mensual</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(timeInfo.monthly, goalCurrency)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Semanal</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(timeInfo.weekly, goalCurrency)}</p>
                  </div>
                </div>
              ) : selectedGoal.deadline ? (
                <p className="text-sm text-red-500 mb-4">⚠️ La fecha límite ya pasó.</p>
              ) : (
                <p className="text-sm text-gray-500 mb-4">Añade una fecha límite para ver cuánto debes aportar por mes.</p>
              )}

              {avgMonthlyIncome > 0 && (
                <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                  <div className="text-blue-500 mt-0.5">💡</div>
                  <div>
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">Sugerencia basada en tus ingresos</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Tu ingreso promedio es {formatCurrency(avgMonthlyIncome, profile?.currency || 'USD')}/mes. 
                      Destinar un 15% ({formatCurrency(suggestedMonthly, profile?.currency || 'USD')}) a esta meta es un buen balance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={() => setIsContributeModalOpen(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-md shadow-green-500/20"
            >
              <DollarSign size={18} /> Aportar
            </button>
            {selectedGoal.is_shared && (
              <button 
                onClick={handleInvite}
                className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Share2 size={18} /> Invitar
              </button>
            )}
          </div>
        </section>

        {selectedGoal.is_shared && (
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
        )}

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
                    +{formatCurrency(c.amount, goalCurrency)}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto a aportar ({goalCurrency})</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={contributionAmount} 
                    onChange={e => setContributionAmount(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-xl font-bold" 
                    placeholder="0.00" 
                  />
                  {safeToSpend <= 0 ? (
                    <p className="text-red-500 text-xs mt-2">⚠️ No tienes dinero libre este mes. Aportar generará deuda o afectará tus gastos fijos.</p>
                  ) : (
                    <p className="text-green-500 text-xs mt-2">💡 Tienes {formatCurrency(safeToSpend, profile?.currency || 'USD')} libres para aportar.</p>
                  )}
                </div>

                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6">
                  Confirmar Aporte
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Meta */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Meta</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEditGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nuevo Monto Objetivo ({goalCurrency})</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={editTargetAmount} 
                    onChange={e => setEditTargetAmount(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white text-xl font-bold" 
                  />
                </div>

                <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3.5 rounded-xl transition-colors shadow-md mt-6">
                  Guardar Cambios
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
              const goalCurrency = goal.currency || 'USD';
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
                      {goal.is_shared ? <><Users size={12} /> 1+</> : <><Target size={12} /> Personal</>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(goal.current_amount, goalCurrency)}</span>
                      <span className="text-gray-500">de {formatCurrency(goal.target_amount, goalCurrency)}</span>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto</label>
                  <input type="number" step="0.01" required value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white font-bold" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Divisa</label>
                  <select 
                    value={goalCurrency}
                    onChange={e => setGoalCurrency(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="COP">COP</option>
                    <option value="MXN">MXN</option>
                    <option value="ARS">ARS</option>
                    <option value="CLP">CLP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Límite (Opcional)</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-green-500 outline-none dark:text-white" />
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <input 
                  type="checkbox" 
                  id="isShared" 
                  checked={isShared} 
                  onChange={e => setIsShared(e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded border-gray-300 focus:ring-green-500"
                />
                <label htmlFor="isShared" className="text-sm font-medium text-blue-900 dark:text-blue-300 cursor-pointer">
                  Hacer esta meta compartida (Multijugador)
                </label>
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
