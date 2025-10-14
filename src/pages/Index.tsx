import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, CheckCircle, Users } from "lucide-react";
import Navigation from "@/components/Navigation";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchStats();

    return () => subscription.unsubscribe();
  }, []);

  const fetchStats = async () => {
    const { data: total } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true });

    const { data: resolved } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .eq("status", "resolved");

    const { data: pending } = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    setStats({
      total: (total as any)?.count || 0,
      resolved: (resolved as any)?.count || 0,
      pending: (pending as any)?.count || 0,
    });
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      {/* Hero Section */}
      <div className="bg-gradient-hero text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-5xl font-bold mb-4">CivicWatch</h1>
            <p className="text-xl text-white/90 max-w-2xl mb-8">
              Empower your community. Report issues, track progress, and make a real difference.
            </p>
            <div className="flex gap-4">
              {session ? (
                <Button
                  size="lg"
                  onClick={() => navigate("/issues")}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  View Issues
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="bg-white text-primary hover:bg-white/90"
                  >
                    Get Started
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/issues")}
                    className="border-white text-white hover:bg-white/10"
                  >
                    Browse Issues
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-muted py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-xl shadow-md text-center">
              <AlertCircle className="h-12 w-12 text-accent mx-auto mb-3" />
              <h3 className="text-3xl font-bold text-foreground">{stats.total}</h3>
              <p className="text-muted-foreground">Total Reports</p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-md text-center">
              <CheckCircle className="h-12 w-12 text-secondary mx-auto mb-3" />
              <h3 className="text-3xl font-bold text-foreground">{stats.resolved}</h3>
              <p className="text-muted-foreground">Issues Resolved</p>
            </div>
            <div className="bg-card p-6 rounded-xl shadow-md text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="text-3xl font-bold text-foreground">{stats.pending}</h3>
              <p className="text-muted-foreground">Active Issues</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Report Issues</h3>
            <p className="text-muted-foreground">
              Spot a problem? Take a photo, add location, and submit your report in seconds.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-muted-foreground">
              Follow your reports and see real-time updates as authorities work to resolve them.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Earn Rewards</h3>
            <p className="text-muted-foreground">
              Get points and badges for active participation and climb the community leaderboard.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!session && (
        <div className="bg-gradient-hero text-white py-16">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of active citizens making their communities better, one report at a time.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-primary hover:bg-white/90"
            >
              Sign Up Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
