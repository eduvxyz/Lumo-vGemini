-- ==========================================
-- LUMO - Supabase Schema & RLS
-- ==========================================

-- 1. PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. TRANSACTIONS
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- 3. RECURRING EXPENSES
CREATE TABLE recurring_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'yearly')) NOT NULL,
  next_due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recurring expenses" ON recurring_expenses FOR ALL USING (auth.uid() = user_id);

-- 4. DEBTS
CREATE TABLE debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  remaining_amount DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own debts" ON debts FOR ALL USING (auth.uid() = user_id);

-- 5. DEBT PAYMENTS
CREATE TABLE debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own debt payments" ON debt_payments FOR ALL USING (auth.uid() = user_id);

-- 6. SAVING GOALS (Multiplayer support)
CREATE TABLE saving_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE saving_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators can manage goals" ON saving_goals FOR ALL USING (auth.uid() = creator_id);

-- 7. GOAL PARTICIPANTS
CREATE TABLE goal_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES saving_goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(goal_id, user_id)
);

ALTER TABLE goal_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view members" ON goal_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM goal_participants gp WHERE gp.goal_id = goal_participants.goal_id AND gp.user_id = auth.uid())
);
CREATE POLICY "Admins can manage participants" ON goal_participants FOR ALL USING (
  EXISTS (SELECT 1 FROM goal_participants gp WHERE gp.goal_id = goal_participants.goal_id AND gp.user_id = auth.uid() AND gp.role = 'admin')
);

-- 8. GOAL CONTRIBUTIONS
CREATE TABLE goal_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES saving_goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view contributions" ON goal_contributions FOR SELECT USING (
  EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = goal_contributions.goal_id AND user_id = auth.uid())
);
CREATE POLICY "Users manage own contributions" ON goal_contributions FOR ALL USING (auth.uid() = user_id);

-- Function to update goal current_amount on contribution
CREATE OR REPLACE FUNCTION update_goal_amount()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE saving_goals SET current_amount = current_amount + NEW.amount WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE saving_goals SET current_amount = current_amount - OLD.amount WHERE id = OLD.goal_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_contribution_change
  AFTER INSERT OR DELETE ON goal_contributions
  FOR EACH ROW EXECUTE PROCEDURE update_goal_amount();

-- Cross-table policies (must be created after all tables exist)
CREATE POLICY "Participants can view goals" ON saving_goals FOR SELECT USING (
  EXISTS (SELECT 1 FROM goal_participants WHERE goal_id = saving_goals.id AND user_id = auth.uid())
);
