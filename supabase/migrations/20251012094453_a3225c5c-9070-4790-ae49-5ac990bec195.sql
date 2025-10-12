-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE issue_status AS ENUM ('pending', 'in_progress', 'resolved', 'rejected');
CREATE TYPE issue_category AS ENUM ('roads', 'lighting', 'waste', 'water', 'parks', 'safety', 'other');
CREATE TYPE user_role AS ENUM ('citizen', 'admin', 'department_head');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category issue_category NOT NULL,
  status issue_status DEFAULT 'pending',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  photo_url TEXT,
  upvotes INTEGER DEFAULT 0,
  priority_score INTEGER DEFAULT 0,
  assigned_department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create issue_updates table for status tracking
CREATE TABLE public.issue_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status issue_status NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create upvotes table
CREATE TABLE public.issue_upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(issue_id, user_id)
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points_required INTEGER NOT NULL,
  badge_level TEXT
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Roles are viewable by everyone" 
  ON public.user_roles FOR SELECT 
  USING (true);

-- RLS Policies for issues
CREATE POLICY "Issues are viewable by everyone" 
  ON public.issues FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create issues" 
  ON public.issues FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own issues" 
  ON public.issues FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for issue_updates
CREATE POLICY "Updates are viewable by everyone" 
  ON public.issue_updates FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create updates" 
  ON public.issue_updates FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for upvotes
CREATE POLICY "Upvotes are viewable by everyone" 
  ON public.issue_upvotes FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can upvote" 
  ON public.issue_upvotes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes" 
  ON public.issue_upvotes FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Achievements are viewable by everyone" 
  ON public.achievements FOR SELECT 
  USING (true);

CREATE POLICY "User achievements are viewable by everyone" 
  ON public.user_achievements FOR SELECT 
  USING (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'citizen');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + p_points
  WHERE id = p_user_id;
END;
$$;

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, points_required, badge_level) VALUES
  ('First Reporter', 'Report your first civic issue', '🏁', 0, 'bronze'),
  ('Community Helper', 'Report 10 issues', '🤝', 100, 'silver'),
  ('Civic Champion', 'Report 50 issues', '🏆', 500, 'gold'),
  ('Popular Voice', 'Get 100 total upvotes', '⭐', 200, 'silver'),
  ('Problem Solver', 'Have 5 issues resolved', '✅', 150, 'silver');