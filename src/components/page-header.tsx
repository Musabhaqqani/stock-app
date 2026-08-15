import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * Sticky page header. The SidebarTrigger is the only way to open the nav on
 * mobile, so it stays visible at every breakpoint.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 !h-5" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg leading-tight font-semibold sm:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        <ModeToggle />
      </div>
    </header>
  );
}
