import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Activity, Check, Factory, Package, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type ActivityLog = {
  id: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  details?: any;
  userName?: string;
  createdAt: string;
};

const actionIcons: Record<string, typeof Activity> = {
  "order.approved": Check,
  "batch.completed": Factory,
  "batch.started": Factory,
  "ingredient.adjusted": AlertTriangle,
  "freezer.stocked": Package,
};

const actionColors: Record<string, string> = {
  "order.approved": "bg-green-500/10 text-green-500",
  "batch.completed": "bg-blue-500/10 text-blue-500",
  "batch.started": "bg-yellow-500/10 text-yellow-500",
  "ingredient.adjusted": "bg-orange-500/10 text-orange-500",
  "freezer.stocked": "bg-cyan-500/10 text-cyan-500",
};

function formatActionType(actionType: string): string {
  return actionType
    .split(".")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ActivityLogPanel() {
  const { data: activityLogs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity/recent"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest system events and actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!activityLogs || activityLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto">
            {activityLogs.slice(0, 10).map((log, index) => {
              const Icon = actionIcons[log.actionType] || Activity;
              const colorClass = actionColors[log.actionType] || "bg-muted text-muted-foreground";
              
              return (
                <div
                  key={log.id || index}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`activity-item-${index}`}
                >
                  <div className={`p-2 rounded-md ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {formatActionType(log.actionType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                    {log.userName && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        by {log.userName}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
