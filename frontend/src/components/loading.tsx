import { cn } from "../lib/utils";

interface LoadingProps {
  className?: string;
  label?: string;
}

export function Loading({ className, label = "Loading..." }: LoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 text-muted-foreground", className)}>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      <p className="mt-2 text-sm">{label}</p>
    </div>
  );
}
