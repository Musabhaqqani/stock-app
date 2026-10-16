"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Table2, MessageSquareText, Users, LogOut, Loader2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/app/actions";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/holdings", label: "Holdings", icon: Table2 },
  { href: "/sentiment", label: "Sentiment", icon: MessageSquareText },
];

/**
 * Spinner for the link currently being navigated to.
 *
 * `useLinkStatus` only reports for the <Link> it is rendered inside, so this
 * marks the specific tab that was clicked. These pages fetch live prices on the
 * server and can take a few seconds — without this the sidebar looks inert and
 * invites a second click.
 */
function NavPending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin opacity-70" />
  ) : null;
}

export function AppSidebar({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  // On mobile the sidebar is an overlay; it has to close itself after a tap or
  // it covers the page the user just navigated to.
  const closeOnMobile = () => isMobile && setOpenMobile(false);

  const items = isAdmin
    ? [...NAV, { href: "/users", label: "Users", icon: Users }]
    : NAV;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-display text-lg font-semibold text-primary-foreground">
            ₹
          </div>
          <div className="grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display text-sm font-semibold">
              Rebalancer
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {userName}
              {isAdmin && " · admin"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Portfolio</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    // Base UI's `render` is this shadcn build's equivalent of
                    // Radix's `asChild`.
                    render={<Link href={item.href} onClick={closeOnMobile} />}
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    <NavPending />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logoutAction} className="w-full">
              <SidebarMenuButton
                render={<button type="submit" className="w-full" />}
                tooltip="Sign out"
              >
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
