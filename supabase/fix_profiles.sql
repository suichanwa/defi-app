-- Drop existing policies if they cause issues
DROP POLICY IF EXISTS "Profiles are public read" ON public.user_profiles;
DROP POLICY IF EXISTS "Signed-in profile insert" ON public.user_profiles;
DROP POLICY IF EXISTS "Signed-in profile update" ON public.user_profiles;
DROP POLICY IF EXISTS "Anonymous profile insert" ON public.user_profiles;
DROP POLICY IF EXISTS "Anonymous profile update" ON public.user_profiles;

-- Recreate with correct policies
CREATE POLICY "Profiles are public read" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (
    auth.uid()::text = id 
    OR id LIKE 'anon_%'
  );

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (
    auth.uid()::text = id 
    OR id LIKE 'anon_%'
  );

-- Allow upsert to work
CREATE POLICY "Users can upsert own profile" ON public.user_profiles
  FOR ALL USING (
    auth.uid()::text = id 
    OR id LIKE 'anon_%'
  );
