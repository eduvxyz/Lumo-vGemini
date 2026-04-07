import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useSafeToSpend() {
  const { user } = useAuth();
  const [safeToSpend, setSafeToSpend] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFinances() {
      if (!user) return;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const dateString = startOfMonth.toISOString().split('T')[0];
      
      try {
        const { data: incomes } = await supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('date', dateString);
        const totalIncome = incomes?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

        const { data: recurring } = await supabase.from('recurring_expenses').select('amount').eq('user_id', user.id);
        const totalRecurring = recurring?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

        const { data: expenses } = await supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').gte('date', dateString);
        const totalExpenses = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

        setSafeToSpend(totalIncome - totalRecurring - totalExpenses);
      } catch (error) {
        console.error("Error fetching finances:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFinances();
  }, [user]);

  return { safeToSpend, loading };
}
