import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

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

  const updateStatus = async (issueId: string, newStatus: "pending" | "in_progress" | "resolved" | "rejected") => {
    const { error } = await supabase
      .from("issues")
      .update({ status: newStatus })
      .eq("id", issueId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated");
      fetchIssues();
      fetchStats();
    }
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Checking permissions...</div>;
  }

  return (
    <div className="min-h-screen bg-muted">
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
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{issue.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Reported by {issue.profiles?.full_name || "Anonymous"} •{" "}
                      {new Date(issue.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="ml-4">{issue.category}</Badge>
                </div>
                <p className="text-muted-foreground mb-3">{issue.description}</p>
                <div className="flex items-center gap-4">
                  <Select
                    value={issue.status}
                    onValueChange={(value) => updateStatus(issue.id, value as "pending" | "in_progress" | "resolved" | "rejected")}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/issues/${issue.id}`)}
                  >
                    View Details
                  </Button>
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
