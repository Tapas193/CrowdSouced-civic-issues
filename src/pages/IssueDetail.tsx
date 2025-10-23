import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import SocialShare from "@/components/SocialShare";
import CommentSection from "@/components/CommentSection";
import { IssueVoting } from "@/components/IssueVoting";

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchIssue();
  }, [id]);

  const fetchIssue = async () => {
    const { data, error } = await supabase
      .from("issues")
      .select(`
        *,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast.error("Failed to load issue");
      navigate("/issues");
    } else {
      setIssue(data);
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
            <IssueVoting 
              issueId={id!} 
              initialUpvotes={issue.upvotes}
            />
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
