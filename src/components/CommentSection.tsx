import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageSquare, Reply, Edit2, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { z } from "zod";

const commentSchema = z.object({
  comment: z.string().trim().min(1, "Comment cannot be empty").max(1000, "Comment must be less than 1000 characters"),
});

interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface CommentSectionProps {
  issueId: string;
  session: any;
}

const CommentSection = ({ issueId, session }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();

    // Set up real-time subscription
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issue_updates',
          filter: `issue_id=eq.${issueId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [issueId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("issue_updates")
      .select(`
        *,
        profiles:user_id (full_name, avatar_url)
      `)
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComments(data);
    }
  };

  const handleAddComment = async () => {
    if (!session) {
      toast.error("Please log in to comment");
      return;
    }

    // Validate comment
    const validationResult = commentSchema.safeParse({ comment: newComment });
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("issue_updates")
      .insert({
        issue_id: issueId,
        user_id: session.user.id,
        comment: validationResult.data.comment,
        status: "pending",
      });

    if (error) {
      toast.error("Failed to add comment");
    } else {
      toast.success("Comment added!");
      setNewComment("");
      fetchComments();
    }
    setLoading(false);
  };

  const handleEditComment = async (commentId: string) => {
    // Validate comment
    const validationResult = commentSchema.safeParse({ comment: editText });
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("issue_updates")
      .update({ comment: validationResult.data.comment })
      .eq("id", commentId);

    if (error) {
      toast.error("Failed to update comment");
    } else {
      toast.success("Comment updated!");
      setEditingId(null);
      setEditText("");
      fetchComments();
    }
    setLoading(false);
  };

  const handleDeleteComment = async () => {
    if (!deleteId) return;

    setLoading(true);
    const { error } = await supabase
      .from("issue_updates")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Failed to delete comment");
    } else {
      toast.success("Comment deleted!");
      setDeleteId(null);
      fetchComments();
    }
    setLoading(false);
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.comment || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Comments ({comments.length})
      </h2>

      {session && (
        <div className="mb-6">
          <Textarea
            placeholder="Add your comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="mb-2 min-h-[100px]"
          />
          <Button
            onClick={handleAddComment}
            disabled={loading || !newComment.trim()}
            className="w-full sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            Post Comment
          </Button>
        </div>
      )}

      {!session && (
        <p className="text-muted-foreground mb-6 text-center py-4 bg-muted rounded-lg">
          Please login to comment
        </p>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="border-l-2 border-primary pl-4 py-2 hover:bg-muted/50 rounded-r-lg transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {comment.profiles?.avatar_url ? (
                    <img
                      src={comment.profiles.avatar_url}
                      alt={comment.profiles.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {getInitials(comment.profiles?.full_name || "User")}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <span className="font-semibold">
                      {comment.profiles?.full_name || "User"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()} at{" "}
                        {new Date(comment.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {session?.user?.id === comment.user_id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(comment)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(comment.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditComment(comment.id)}
                          disabled={loading || !editText.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground break-words">
                      {comment.comment || ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CommentSection;
