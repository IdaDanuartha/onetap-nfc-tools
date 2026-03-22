import { ThemeToggle } from "@/components/theme-toggle";
import { Wifi } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden transition-colors duration-300">
      {/* Absolute Header with Logo & Theme Toggle */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Wifi className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-foreground font-bold tracking-tight text-lg">OneTap NFC</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="relative w-full max-w-md z-10 -mt-10">
        {children}
      </div>

      {/* Subtle Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-3xl dark:bg-primary/[0.05]" />
        <div className="absolute -bottom-40 -left-20 w-[600px] h-[600px] bg-muted/50 rounded-full blur-3xl dark:bg-accent/30" />
      </div>
    </div>
  );
}
