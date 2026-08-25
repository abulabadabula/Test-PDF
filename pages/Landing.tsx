import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl text-primary">Test-PDF Editor</div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button onClick={() => navigate("/projects")}>Go to Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>Login</Button>
                <Button onClick={() => navigate("/register")}>Sign Up</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 md:py-32 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Professional PDF Annotation & Management Tool
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Efficient and precise PDF drawing annotation, measurement, and collaboration features to help your team boost productivity.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={() => navigate(user ? "/projects" : "/register")}>
              {user ? "Manage Projects" : "Start for Free"}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
              Already have an account? Log in
            </Button>
          </div>
        </section>

        <section id="features" className="py-16 container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Core Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-xl bg-card">
              <h3 className="text-xl font-semibold mb-2">Precise Annotation</h3>
              <p className="text-muted-foreground">Supports a variety of annotation tools to meet the markup needs of architectural, engineering, and other drawings.</p>
            </div>
            <div className="p-6 border rounded-xl bg-card">
              <h3 className="text-xl font-semibold mb-2">Project Management</h3>
              <p className="text-muted-foreground">Centralize all your PDF projects with cloud sync, allowing you to access your work anytime, anywhere.</p>
            </div>
            <div className="p-6 border rounded-xl bg-card">
              <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">Share annotations with team members in real time to improve communication and collaboration efficiency.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 bg-background">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Test-PDF Editor. All rights reserved.
        </div>
      </footer>
    </div>
  );
}