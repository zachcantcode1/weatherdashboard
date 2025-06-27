import * as React from "react"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  Home as HomeIcon, // Renaming to avoid conflict if 'Home' is used elsewhere
  Briefcase
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: HomeIcon,
      isActive: false, // isActive will be handled by NavMain
    },
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      url: '/',
    },
    {
      title: 'Settings',
      icon: Settings,
      url: '/settings',
    },
    // Add other main navigation items here if needed
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#", // Placeholder URL
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#", // Placeholder URL
      icon: Send,
    },
    // Add more secondary links if desired
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#", // Placeholder URL
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#", // Placeholder URL
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#", // Placeholder URL
      icon: Map,
    },
    // Add more projects if desired
  ],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div
                  className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">WKYW</span>
                  <span className="truncate text-xs">Weather Dashboard</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Original console.log for data.navMain (now at top level) can be removed from here if desired, or kept for render-time check */}
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
