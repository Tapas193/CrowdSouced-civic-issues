import { useState, useEffect } from "react";
import { ArrowBigUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IssueVotingProps {
  issueId: string;
  initialUpvotes: number;
  variant?: "default" | "compact";
}

export function IssueVoting({ issueId, initialUpvotes, variant = "default" }: IssueVotingProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        checkUserUpvote(user.id);
      }
    };
    getUser();

    // Subscribe to upvote changes
    const channel = supabase
      .channel(`issue-upvotes-${issueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issue_upvotes',
          filter: `issue_id=eq.${issueId}`,
        },
        async () => {
          await fetchUpvoteCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [issueId]);

  const checkUserUpvote = async (uid: string) => {
    const { data } = await supabase
      .from('issue_upvotes')
      .select('id')
      .eq('issue_id', issueId)
      .eq('user_id', uid)
      .maybeSingle();

    setHasUpvoted(!!data);
  };

  const fetchUpvoteCount = async () => {
    const { count } = await supabase
      .from('issue_upvotes')
      .select('*', { count: 'exact', head: true })
      .eq('issue_id', issueId);

    if (count !== null) {
      setUpvotes(count);
    }
  };

  const handleUpvote = async () => {
    if (!userId) {
      toast.error("Please sign in to upvote");
      return;
    }

    setIsLoading(true);

    try {
      if (hasUpvoted) {
        // Remove upvote
        const { error } = await supabase
          .from('issue_upvotes')
          .delete()
          .eq('issue_id', issueId)
          .eq('user_id', userId);

        if (error) throw error;

        setHasUpvoted(false);
        setUpvotes(prev => Math.max(0, prev - 1));
        toast.success("Upvote removed");
      } else {
        // Add upvote
        const { error } = await supabase
          .from('issue_upvotes')
          .insert({ issue_id: issueId, user_id: userId });

        if (error) throw error;

        setHasUpvoted(true);
        setUpvotes(prev => prev + 1);
        toast.success("Issue upvoted!");
      }

      // Update issue upvotes count
      await supabase
        .from('issues')
        .update({ upvotes })
        .eq('id', issueId);

    } catch (error) {
      console.error('Error toggling upvote:', error);
      toast.error("Failed to upvote");
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <Button
        variant={hasUpvoted ? "default" : "outline"}
        size="sm"
        onClick={handleUpvote}
        disabled={isLoading || !userId}
        className={cn(
          "gap-1",
          hasUpvoted && "bg-primary text-primary-foreground"
        )}
      >
        <ArrowBigUp className={cn("h-4 w-4", hasUpvoted && "fill-current")} />
        <span className="font-semibold">{upvotes}</span>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        variant={hasUpvoted ? "default" : "outline"}
        size="icon"
        onClick={handleUpvote}
        disabled={isLoading || !userId}
        className={cn(
          "rounded-lg",
          hasUpvoted && "bg-primary text-primary-foreground"
        )}
      >
        <ArrowBigUp className={cn("h-6 w-6", hasUpvoted && "fill-current")} />
      </Button>
      <span className="text-sm font-semibold">{upvotes}</span>
    </div>
  );
}
