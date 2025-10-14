import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Calendar, ThumbsUp, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [session, setSession] = useState<any>(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchIssue();
    fetchUpdates();
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

  const fetchUpdates = async () => {
    const { data } = await supabase
      .from("issue_updates")
      .select(`
        *,
        profiles:user_id (full_name)
      `)
      .eq("issue_id", id)
      .order("created_at", { ascending: false });

    setUpdates(data || []);
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
      toast.success("Upvoted!");
    }
  };

  const handleAddUpdate = async () => {
    if (!session || !newUpdate.trim()) return;

    const { error } = await supabase
      .from("issue_updates")
      .insert({
        issue_id: id,
        user_id: session.user.id,
        comment: newUpdate,
        status: issue.status || "pending",
      });

    if (error) {
      toast.error("Failed to add update");
    } else {
      toast.success("Update added");
      setNewUpdate("");
      fetchUpdates();
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Reported by {issue.profiles?.full_name || "Anonymous"}</span>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Updates
          </h2>

          {session && (
            <div className="mb-6">
              <Textarea
                placeholder="Add an update..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                className="mb-2"
              />
              <Button onClick={handleAddUpdate}>Post Update</Button>
            </div>
          )}

          <div className="space-y-4">
            {updates.length === 0 ? (
              <p className="text-muted-foreground">No updates yet</p>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="border-l-2 border-primary pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold">
                      {update.profiles?.full_name || "User"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(update.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{update.comment || ""}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default IssueDetail;
