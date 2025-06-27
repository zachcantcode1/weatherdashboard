"use client"

import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items
}) {
  const location = useLocation();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;

          if (hasSubItems) {
            return (
              <Collapsible key={item.title} asChild>
                <SidebarMenuItem className="p-0">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      variant="ghost"
                      className="group flex w-full items-center justify-between"
                    >
                      <div className="flex items-center">
                        {item.icon && <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />}
                        <span className="truncate">{item.title}</span>
                      </div>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-7 py-1">
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={location.pathname === subItem.url}
                            className="w-full justify-start"
                          >
                            <Link to={subItem.url}>
                              <span className="truncate">{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          } else {
            // Regular item without sub-menu
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={location.pathname === item.url}
                >
                  <Link to={item.url}>
                    {item.icon && <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />}
                    <span className="flex-grow truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
