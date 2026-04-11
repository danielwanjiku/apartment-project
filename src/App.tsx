import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import TenantPortal from "./pages/TenantPortal.tsx";
import Auth from "./pages/Auth.tsx";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

const ProtectedOwner = () => {
  const { user, role, loading, assignRole, refresh } = useAuth();

  useEffect(() => {
    if (user && !role && !loading) {
      assignRole(user.id, 'owner').then(() => refresh());
    }
  }, [user, role, loading]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Auth mode="owner" />;
  if (role && role !== 'owner') return <Auth mode="owner" />;
  if (!role) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Owner */}
          <Route path="/owner/login" element={<Auth mode="owner" />} />
          <Route path="/owner" element={<ProtectedOwner />} />

          {/* Tenant */}
          {/* Tenant — public, no login needed */}
          <Route path="/tenant" element={<TenantPortal />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
