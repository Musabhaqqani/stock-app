import { requireUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

/**
 * Shell for every signed-in page. `requireUser()` here means no route in this
 * group can render without a session, including ones added later.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar userName={user.name} isAdmin={user.isAdmin} />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}
