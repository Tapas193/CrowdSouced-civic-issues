import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (role?.role !== "admin") {
      toast.error("Access denied: Admin only");
      navigate("/issues");
      return;
    }

    setIsAdmin(true);
    fetchIssues();
    fetchStats();
  };

  const fetchIssues = async () => {
    const { data } = await supabase
      .from("issues")
      .select(`
        *,
        profiles:reporter_id (full_name)
      `)
      .order("created_at", { ascending: false });

    setIssues(data || []);
  };

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true });

    const { count: pending } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: inProgress } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress");

    const { count: resolved } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved");

    setStats({
      total: total || 0,
      pending: pending || 0,
      inProgress: inProgress || 0,
      resolved: resolved || 0,
    });
  };

  const markAsCompleted = async (issueId: string) => {
    const { error } = await supabase
      .from("issues")
      .update({ 
        status: "resolved",
        resolved_at: new Date().toISOString()
      })
      .eq("id", issueId);

    if (error) {
      toast.error("Failed to mark as completed");
    } else {
      toast.success("Issue marked as completed!");
      fetchIssues();
      fetchStats();
    }
  };

  const updateStatus = async (issueId: string, newStatus: "pending" | "in_progress" | "resolved" | "rejected") => {
    const updateData: any = { status: newStatus };
    
    if (newStatus === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("issues")
      .update(updateData)
      .eq("id", issueId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Issue status successfully updated to ${newStatus === "in_progress" ? "In Progress" : newStatus}!`);
      fetchIssues();
      fetchStats();
    }
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Checking permissions...</div>;
  }

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <div className="bg-gradient-hero text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-white/80">Manage and resolve community issues</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-status-pending" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold">{stats.inProgress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-status-progress" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-3xl font-bold">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-status-resolved" />
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">All Issues</h2>
          <div className="space-y-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center pt-1">
                    <Checkbox
                      checked={issue.status === "resolved"}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          markAsCompleted(issue.id);
                        }
                      }}
                      className="h-5 w-5"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className={`font-semibold text-lg ${issue.status === "resolved" ? "line-through text-muted-foreground" : ""}`}>
                          {issue.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Reported by {issue.profiles?.full_name || "Anonymous"} •{" "}
                          {new Date(issue.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge>{issue.category}</Badge>
                        <Badge 
                          className={
                            issue.status === "pending" ? "bg-status-pending" :
                            issue.status === "in_progress" ? "bg-status-inProgress" :
                            issue.status === "resolved" ? "bg-status-resolved" :
                            "bg-status-rejected"
                          }
                        >
                          {issue.status === "in_progress" ? "In Progress" : issue.status}
                        </Badge>
                      </div>
                    </div>
                    <p className={`text-muted-foreground mb-3 ${issue.status === "resolved" ? "line-through" : ""}`}>
                      {issue.description}
                    </p>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/issues/${issue.id}`)}
                      >
                        View Details
                      </Button>
                      {issue.status !== "resolved" && (
                        <Button
                          size="sm"
                          onClick={() => markAsCompleted(issue.id)}
                          className="bg-status-resolved hover:bg-status-resolved/90"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
