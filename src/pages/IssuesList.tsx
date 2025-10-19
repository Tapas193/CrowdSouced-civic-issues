import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { IssueCard } from "@/components/IssueCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal, Trophy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const IssuesList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [filterStatus, filterCategory, filterDepartment, sortBy, searchQuery]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("issues")
      .select("assigned_department")
      .not("assigned_department", "is", null);

    if (data) {
      const uniqueDepts = Array.from(new Set(data.map(d => d.assigned_department).filter(Boolean)));
      setDepartments(uniqueDepts as string[]);
    }
  };

  const fetchIssues = async () => {
    try {
      let query = supabase
        .from("issues")
        .select(`
          *,
          profiles (
            full_name
          )
        `);

      // Apply filters
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as any);
      }

      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory as any);
      }

      if (filterDepartment !== "all") {
        query = query.eq("assigned_department", filterDepartment);
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "most_upvoted":
          query = query.order("upvotes", { ascending: false });
          break;
        case "least_upvoted":
          query = query.order("upvotes", { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      setIssues(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterCategory("all");
    setFilterDepartment("all");
    setSortBy("newest");
  };

  const activeFiltersCount = [
    filterStatus !== "all",
    filterCategory !== "all",
    filterDepartment !== "all",
    searchQuery !== "",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />
      <div className="bg-gradient-hero text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Community Issues</h1>
              <p className="text-white/90 mt-2">Track and resolve civic problems together</p>
            </div>
            <Button
              onClick={() => navigate("/leaderboard")}
              variant="secondary"
              className="bg-white/20 hover:bg-white/30"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
            <Input
              type="text"
              placeholder="Search issues by title, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex flex-wrap gap-3 flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="roads">Roads</SelectItem>
                  <SelectItem value="lighting">Lighting</SelectItem>
                  <SelectItem value="waste">Waste</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="parks">Parks</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="most_upvoted">Most Upvoted</SelectItem>
                  <SelectItem value="least_upvoted">Least Upvoted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {searchQuery && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Search: "{searchQuery}"
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Status: {filterStatus}
                </Badge>
              )}
              {filterCategory !== "all" && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Category: {filterCategory}
                </Badge>
              )}
              {filterDepartment !== "all" && (
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Department: {filterDepartment}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || activeFiltersCount > 0 
                ? "No issues match your search criteria. Try adjusting your filters." 
                : "No issues found. Be the first to report!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onClick={() => navigate(`/issue/${issue.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6">
        <Button
          onClick={() => navigate("/report")}
          size="lg"
          className="rounded-full shadow-xl bg-primary hover:bg-primary-hover h-16 w-16 p-0"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default IssuesList;
