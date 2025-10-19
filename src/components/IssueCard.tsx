import { MapPin, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { IssueVoting } from "./IssueVoting";

interface IssueCardProps {
  issue: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    address?: string;
    upvotes: number;
    created_at: string;
    assigned_department?: string;
    profiles?: {
      full_name?: string;
    };
  };
  onClick: () => void;
}

const categoryLabels: Record<string, string> = {
  roads: "Roads",
  lighting: "Lighting",
  waste: "Waste",
  water: "Water",
  parks: "Parks",
  safety: "Safety",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  pending: "bg-status-pending",
  in_progress: "bg-status-inProgress",
  resolved: "bg-status-resolved",
  rejected: "bg-status-rejected",
};

export const IssueCard = ({ issue, onClick }: IssueCardProps) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow bg-gradient-card">
      <div 
        className="cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground line-clamp-2">
              {issue.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              By {issue.profiles?.full_name || "Anonymous"}
            </p>
          </div>
          <Badge className={`${statusColors[issue.status]} text-white shrink-0 ml-2`}>
            {statusLabels[issue.status]}
          </Badge>
        </div>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
          {issue.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Badge variant="outline">{categoryLabels[issue.category]}</Badge>
          </div>
          
          {issue.assigned_department && (
            <Badge variant="secondary" className="bg-civic-blue/20 text-civic-blue border-civic-blue/30">
              {issue.assigned_department}
            </Badge>
          )}
          
          {issue.address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{issue.address}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div onClick={(e) => e.stopPropagation()}>
          <IssueVoting 
            issueId={issue.id} 
            initialUpvotes={issue.upvotes}
            variant="compact"
          />
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Card>
  );
};
