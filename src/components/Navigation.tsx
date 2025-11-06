import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Home, ListChecks, Trophy, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { NotificationCenter } from "./NotificationCenter";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdmin(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    setIsAdmin(data?.role === "admin");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (!session) return null;

  return (
    <nav className="bg-gradient-hero text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-xl font-bold hover:text-white/80 transition-colors"
            >
              <Shield className="h-6 w-6" />
              CivicWatch
            </button>
            
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={location.pathname === "/" ? "secondary" : "ghost"}
                onClick={() => navigate("/")}
                className="text-white hover:bg-white/10"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button
                variant={location.pathname === "/issues" ? "secondary" : "ghost"}
                onClick={() => navigate("/issues")}
                className="text-white hover:bg-white/10"
              >
                <ListChecks className="mr-2 h-4 w-4" />
                Issues
              </Button>
              <Button
                variant={location.pathname === "/report" ? "secondary" : "ghost"}
                onClick={() => navigate("/report")}
                className="text-white hover:bg-white/10"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Report
              </Button>
              <Button
                variant={location.pathname === "/leaderboard" ? "secondary" : "ghost"}
                onClick={() => navigate("/leaderboard")}
                className="text-white hover:bg-white/10"
              >
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Button>
              {isAdmin && (
                <Button
                  variant={location.pathname === "/admin" ? "secondary" : "ghost"}
                  onClick={() => navigate("/admin")}
                  className="text-white hover:bg-white/10"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
