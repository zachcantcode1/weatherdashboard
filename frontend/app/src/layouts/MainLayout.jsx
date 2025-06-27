// src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router-dom'; // Added Link and NavLink for Breadcrumb and navigation
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from '@/components/AppSidebar';
import { AlertsSidebar } from '@/components/AlertsSidebar';
import { Menu } from 'lucide-react';
import { cn } from "@/lib/utils"; // For conditional class names

const MainLayout = () => {
  const location = useLocation();
  console.log('MainLayout location:', location); // Log location object

  const showAlersSidebar = location.pathname !== '/';

  return (
    <SidebarProvider defaultOpen={false}>
      {console.log('MainLayout rendering AppSidebar...')}
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-0">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-6" // Adjusted height to match Menu icon
            />

            {/* TODO: Make Breadcrumb dynamic based on route */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  {/* Using Link from react-router-dom for navigation */}
                  <BreadcrumbLink asChild>
                    <Link to="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  {/* This should ideally be dynamic based on the current page */}
                  <BreadcrumbPage>Current Page</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {/* Future placeholder for user profile/actions in header */}
          <div className="ml-auto"></div>
        </header>

        {/* Wrapper for main content and right sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* New wrapper for rounding and clipping main content area */}
          <div className="flex-1 relative rounded-lg overflow-hidden m-2 shadow-lg">
            {/* Main content area that scrolls */}
            <main className="h-full w-full overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
          {showAlersSidebar && (
            <AlertsSidebar
              className="h-full z-20"
            />
          )}
        </div>

        <footer className="bg-background border-t p-4 text-center text-sm text-muted-foreground mt-auto shrink-0">
          <p>&copy; {new Date().getFullYear()} WX DASHBOARD. All rights reserved.</p>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default MainLayout;
