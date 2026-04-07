import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Target, CheckCircle, AlertCircle } from 'lucide-react';

export function JoinGoal() {
  const { goalId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchGoal() {
      if (!goalId) return;
      try {
        const { data, error } = await supabase
          .from('saving_goals')
          .select('name, creator_id')
          .eq('id', goalId)
          .single();
          
        if (error) throw error;
        setGoal(data);
      } catch (error) {
        console.error("Error fetching goal:", error);
        setStatus('error');
        setMessage('Meta no encontrada o enlace inválido.');
      } finally {
        setLoading(false);
      }
    }
    fetchGoal();
  }, [goalId]);

  async function handleJoin() {
    if (!user || !goalId) {
      // Redirigir a login si no está autenticado, guardando la ruta de retorno
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Verificar si ya es participante
      const { data: existing } = await supabase
        .from('goal_participants')
        .select('id')
        .eq('goal_id', goalId)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        setStatus('success');
        setMessage('Ya eres participante de esta meta.');
        setTimeout(() => navigate('/goals'), 2000);
        return;
      }

      // Unirse a la meta
      const { error } = await supabase.from('goal_participants').insert({
        goal_id: goalId,
        user_id: user.id,
        role: 'member'
      });

      if (error) throw error;

      setStatus('success');
      setMessage('¡Te has unido a la meta con éxito!');
      setTimeout(() => navigate('/goals'), 2000);
    } catch (error: any) {
      console.error("Error joining goal:", error);
      setStatus('error');
      setMessage(error.message || 'Ocurrió un error al intentar unirte.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-gray-100 dark:border-gray-800">
        <Target size={64} className="mx-auto text-green-500 mb-6" />
        
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Cargando información de la meta...</p>
        ) : status === 'error' ? (
          <>
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            <button onClick={() => navigate('/')} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-3 rounded-xl">
              Ir al Inicio
            </button>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Genial!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            <p className="text-sm text-gray-400">Redirigiendo a tus metas...</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Te han invitado</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Únete a la meta de ahorro <span className="font-bold text-gray-900 dark:text-white">"{goal?.name}"</span>.
            </p>
            <button 
              onClick={handleJoin}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md shadow-green-500/20"
            >
              {user ? 'Aceptar Invitación' : 'Inicia sesión para unirte'}
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full mt-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium py-3 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
