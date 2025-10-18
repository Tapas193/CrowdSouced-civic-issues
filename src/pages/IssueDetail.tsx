import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Calendar, ThumbsUp, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import SocialShare from "@/components/SocialShare";
import CommentSection from "@/components/CommentSection";

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchIssue();
    checkUpvote();
  }, [id]);

  const fetchIssue = async () => {
    const { data, error } = await supabase
      .from("issues")
      .select(`
        *,
        profiles:reporter_id (full_name, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Failed to load issue");
      navigate("/issues");
    } else {
      setIssue(data);
    }
  };

  const checkUpvote = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("issue_upvotes")
      .select("*")
      .eq("issue_id", id)
      .eq("user_id", session.user.id)
      .single();

    setHasUpvoted(!!data);
  };

  const handleUpvote = async () => {
    if (!session) {
      toast.error("Please login to upvote");
      return;
    }

    if (hasUpvoted) {
      await supabase
        .from("issue_upvotes")
        .delete()
        .eq("issue_id", id)
        .eq("user_id", session.user.id);

      const newUpvotes = Math.max(0, issue.upvotes - 1);
      await supabase
        .from("issues")
        .update({ upvotes: newUpvotes })
        .eq("id", id);

      setHasUpvoted(false);
      setIssue({ ...issue, upvotes: newUpvotes });
      toast.success("Upvote removed successfully!");
    } else {
      await supabase
        .from("issue_upvotes")
        .insert({ issue_id: id, user_id: session.user.id });

      const newUpvotes = issue.upvotes + 1;
      await supabase
        .from("issues")
        .update({ upvotes: newUpvotes })
        .eq("id", id);

      setHasUpvoted(true);
      setIssue({ ...issue, upvotes: newUpvotes });
      toast.success("Issue upvoted successfully!");
    }
  };

  if (!issue) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const statusColors = {
    pending: "bg-status-pending",
    in_progress: "bg-status-inProgress",
    resolved: "bg-status-resolved",
    rejected: "bg-status-rejected",
  };

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/issues")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Issues
        </Button>

        <Card className="p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{issue.title}</h1>
              <Badge className={statusColors[issue.status as keyof typeof statusColors]}>
                {issue.status}
              </Badge>
            </div>
            <Button
              variant={hasUpvoted ? "default" : "outline"}
              onClick={handleUpvote}
              className="flex items-center gap-2"
            >
              <ThumbsUp className={`h-4 w-4 ${hasUpvoted ? "fill-current" : ""}`} />
              {issue.upvotes}
            </Button>
          </div>

          <div className="space-y-3 text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{issue.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Reported {new Date(issue.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <p className="text-lg mb-4">{issue.description}</p>

          {issue.photo_url && (
            <img
              src={issue.photo_url}
              alt={issue.title}
              className="w-full rounded-lg mb-4"
            />
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span>Reported by {issue.profiles?.full_name || "Anonymous"}</span>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-2">Share this issue:</p>
            <SocialShare
              title={issue.title}
              description={issue.description}
              url={window.location.href}
            />
          </div>
        </Card>

        <CommentSection issueId={id!} session={session} />
      </div>
    </div>
  );
};

export default IssueDetail;
