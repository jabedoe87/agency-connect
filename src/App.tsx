import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import Generator from "./pages/Generator";
import Projects from "./pages/Projects";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Clients from "./pages/Clients";
import Booking from "./pages/Booking";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/onboarding" element={
              <ProtectedRoute><Onboarding /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><OnboardingGuard><Dashboard /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="/leads" element={
              <ProtectedRoute><OnboardingGuard><Leads /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute><OnboardingGuard><Clients /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="/booking" element={
              <ProtectedRoute><OnboardingGuard><Booking /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><OnboardingGuard><Settings /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="/generator" element={
              <ProtectedRoute><OnboardingGuard><Generator /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute><OnboardingGuard><Projects /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute><OnboardingGuard><Analytics /></OnboardingGuard></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
