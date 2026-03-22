import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
      </div>
    </div>
  );
}
