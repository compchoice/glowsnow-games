import { Toaster } from "@/components/ui/sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { DevConsole } from "@/components/DevConsole";
import { SiteEffects } from "@/components/SiteChrome";
import {
  RootErrorBoundary,
  RouteLoading,
  RouteSyncer,
  SnowfallMount,
  ToolbarErrorBoundary,
} from "@/components/AppBoot";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { applyTheme, themeStore } from "@/lib/theme";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Games = lazy(() => import("./pages/Games.tsx"));
const GameDetail = lazy(() => import("./pages/GameDetail.tsx"));
const ProxyPage = lazy(() => import("./pages/Proxy.tsx"));
const Community = lazy(() => import("./pages/Community.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const Shelf = lazy(() => import("./pages/Shelf.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Paint the saved accent and light/dark choice before the first render.
applyTheme(themeStore.get());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/games" element={<Games />} />
              <Route path="/games/:slug" element={<GameDetail />} />
              <Route path="/proxy" element={<ProxyPage />} />
              <Route path="/community" element={<Community />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/u/:userId" element={<Profile />} />
              <Route
                path="/shelf"
                element={
                  <RequireAuth
                    title="Sign in to open your shelf"
                    description="Saved games and playlists belong to your account."
                  >
                    <Shelf />
                  </RequireAuth>
                }
              />
              <Route
                path="/auth"
                element={<AuthPage redirectAfterAuth="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <Admin />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
        <SiteEffects />
        <SnowfallMount />
        <DevConsole />
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
