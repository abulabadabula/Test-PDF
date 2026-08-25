//src/App.tsx
// import { EditorShell } from "@/components/editor/EditorShell";

// export default function App() {
//   return <EditorShell />;
// }


import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Projects from "@/pages/Projects";
import { EditorShell } from "@/components/editor/EditorShell"; // 保持你原有的编辑器入口

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-muted-foreground">
        正在验证登录状态...
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/projects" /> : <Auth />}
      </Route>
      
      <Route path="/register">
        {user ? <Redirect to="/projects" /> : <Auth />}
      </Route>

      <Route path="/projects">
        <ProtectedRoute>
          <Projects />
        </ProtectedRoute>
      </Route>

      <Route path="/editor/:projectId">
        <ProtectedRoute>
          <EditorShell />
        </ProtectedRoute>
      </Route>

      <Route path="/">
        <Landing />
      </Route>

      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      {/* ✅ 关键：AuthProvider 必须包裹 AppRouter */}
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRouter />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;