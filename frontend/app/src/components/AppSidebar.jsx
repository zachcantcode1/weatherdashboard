import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, BarChart2, Settings, HelpCircle, Map, Radar, CloudSun, Tornado, Camera, List, Newspaper, ChevronDown, ExternalLink } from "lucide-react"; // Added Camera, List, Newspaper, ChevronDown, ExternalLink icons
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Home",
    path: "/",
    icon: Home,
  },
  {
    title: "Interactive Map",
    path: "/map",
    icon: Map,
  },
  {
    title: "Live Cams",
    path: "/live-cams",
    icon: Camera,
  },
  {
    title: "Recent LSRs",
    path: "/recent-lsr",
    icon: List,
  },
  {
    title: "SPC Outlooks",
    path: "/spc",
    icon: Newspaper,
  },
  {
    title: "External Services",
    icon: ExternalLink, // Using a generic external link icon for the dropdown
    subItems: [
      {
        title: "Pivotal Weather",
        url: "https://beta.pivotalweather.com/login",
        isExternal: true,
        icon: CloudSun,
      },
      {
        title: "WeatherWise",
        url: "https://web.weatherwise.app/#map=3.82/36.91/-96.35",
        isExternal: true,
        icon: Radar,
      },
    ],
  },
  {
    title: "Analytics",
    path: "#", // Placeholder
    icon: BarChart2,
  },
  {
    title: "Settings",
    path: "#", // Placeholder
    icon: Settings,
  },
  {
    title: "Help",
    path: "#", // Placeholder
    icon: HelpCircle,
  },
];


export function AppSidebar() {
  const location = useLocation();

  const renderMenuItems = (items) => {
    return items.map((item) => {
      const isExternal = !!item.isExternal;
      const isActive = !isExternal && item.path && location.pathname === item.path;
      const hasSubItems = item.subItems && item.subItems.length > 0;

      if (hasSubItems) {
        return (
          <Collapsible key={item.title} asChild>
            <SidebarMenuItem className="p-0">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground group-data-[state=open]:bg-sidebar-accent group-data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex items-center">
                    {item.icon && <item.icon className="h-5 w-5 mr-2 flex-shrink-0" />}
                    <span className="truncate">{item.title}</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="ml-7 py-1">
                  {item.subItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        // isActive={location.pathname === subItem.url} // Not applicable for external links
                        className="w-full justify-start rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                      >
                        <a href={subItem.url} target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                          {subItem.icon && <subItem.icon className="h-5 w-5 mr-2 flex-shrink-0" />}
                          <span className="truncate">{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        );
      }

      // Regular item or external link without sub-menu
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            className={cn(
              "w-full justify-start rounded-md px-3 py-2 text-sm font-medium",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
            )}
          >
            {isExternal ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                <item.icon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="truncate">{item.title}</span>
              </a>
            ) : (
              <Link to={item.path} className="flex items-center w-full">
                <item.icon className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar className="rounded-r-lg">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {renderMenuItems(menuItems)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
