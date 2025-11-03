-- Create a security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add RLS policy allowing admins to update any issue
CREATE POLICY "Admins can update all issues"
ON public.issues
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix issue_updates RLS policy to prevent user impersonation
DROP POLICY IF EXISTS "Authenticated users can create updates" ON public.issue_updates;
CREATE POLICY "Users can create their own updates"
ON public.issue_updates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Make user_id NOT NULL to enforce association with a user
ALTER TABLE public.issue_updates ALTER COLUMN user_id SET NOT NULL;

-- Add UPDATE and DELETE policies for issue_updates
CREATE POLICY "Users can update their own comments"
ON public.issue_updates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.issue_updates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);