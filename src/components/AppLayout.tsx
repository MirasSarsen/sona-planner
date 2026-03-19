import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/lib/supabase";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-auto">
          <header className="h-12 flex items-center justify-between border-b border-border px-4">
            <SidebarTrigger className="md:hidden" />
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-muted-foreground hover:text-foreground ml-auto"
            >
              Выйти
            </button>
          </header>
          <main className="flex-1 p-6 md:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
