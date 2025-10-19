-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  issue_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to create notification for issue updates
CREATE OR REPLACE FUNCTION public.notify_issue_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  issue_owner UUID;
  issue_title TEXT;
BEGIN
  -- Get issue owner and title
  SELECT user_id, title INTO issue_owner, issue_title
  FROM public.issues
  WHERE id = NEW.issue_id;
  
  -- Don't notify if the commenter is the issue owner
  IF issue_owner != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, issue_id, title, message)
    VALUES (
      issue_owner,
      NEW.issue_id,
      'New comment on your issue',
      'Someone commented on "' || issue_title || '"'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for comment notifications
CREATE TRIGGER on_comment_created
AFTER INSERT ON public.issue_updates
FOR EACH ROW
WHEN (NEW.comment IS NOT NULL)
EXECUTE FUNCTION public.notify_issue_update();

-- Function to notify on status changes
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO public.notifications (user_id, issue_id, title, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      'Issue status updated',
      'Your issue "' || NEW.title || '" status changed to ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for status change notifications
CREATE TRIGGER on_status_changed
AFTER UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.notify_status_change();