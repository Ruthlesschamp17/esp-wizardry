import { Wind } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function AppHeader({ subtitle, right }: { subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-panel/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Wind className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Intel Air <span className="text-primary">ESP Pro</span></span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">HVAC Engineering Suite</span>
          </div>
        </Link>
        {subtitle && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="text-sm text-muted-foreground truncate">{subtitle}</div>
          </>
        )}
        <div className="flex-1" />
        {right}
      </div>
    </header>
  );
}
