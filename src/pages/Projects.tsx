import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { FileText, FolderOpen, Plus, Trash2, LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface Project {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export default function Projects() {
  const [, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchProjects();
  }, [user, navigate]);

  async function fetchProjects() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch projects:", error);
      toast.error("加载项目失败，请确保已在 Supabase 创建 projects 表");
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }

  async function handleCreate() {
    const name = newProjectName.trim();
    if (!name) { toast.error("请输入项目名称"); return; }
    if (!user) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("projects")
      .insert([{ name, user_id: user.id }])
      .select()
      .single();

    if (error) {
      toast.error("创建项目失败: " + error.message);
    } else {
      setNewProjectName("");
      toast.success("项目创建成功");
      setProjects([data, ...projects]);
    }
    setCreating(false);
  }

  async function handleDelete(project: Project) {
    const confirmed = window.confirm(`确定删除项目“${project.name}”吗？`);
    if (!confirmed) return;

    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) {
      toast.error("删除失败: " + error.message);
    } else {
      toast.success("项目已删除");
      setProjects(projects.filter((p) => p.id !== project.id));
    }
  }

  async function handleRename(project: Project) {
    const name = window.prompt("请输入新的项目名称", project.name);
    if (name === null || !name.trim()) return;

    const { error } = await supabase.from("projects").update({ name: name.trim() }).eq("id", project.id);
    if (error) {
      toast.error("重命名失败: " + error.message);
    } else {
      toast.success("重命名成功");
      setProjects(projects.map((p) => (p.id === project.id ? { ...p, name: name.trim() } : p)));
    }
  }

  async function handleLogout() {
    const result = await signOut();
    if (result.error) { toast.error(result.error.message); return; }
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">PDF</div>
          <div>
            <div className="font-semibold text-sm">Test-PDF Editor</div>
            <div className="text-xs text-muted-foreground">Project Management</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />退出
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">我的项目</h1>
            <p className="text-sm text-muted-foreground mt-1">管理你的 PDF 图纸和标注项目</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-primary" />
            <h2 className="font-medium">新建项目</h2>
          </div>
          <div className="flex gap-3">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="例如：Auckland Warehouse - PDF Markup"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "创建中..." : "创建项目"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">项目列表</h2>
          <span className="text-xs text-muted-foreground">{projects.length} 个项目</span>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">正在加载项目...</div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-20 text-center">
            <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">还没有项目</p>
            <p className="text-sm text-muted-foreground mt-1">创建一个项目开始使用 PDF Editor</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate(`/editor/${project.id}`)}
                onDelete={() => handleDelete(project)}
                onRename={() => handleRename(project)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project, onOpen, onDelete, onRename }: { project: Project; onOpen: () => void; onDelete: () => void; onRename: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex gap-1">
          <button onClick={onRename} className="w-8 h-8 rounded hover:bg-muted flex items-center justify-center" title="重命名">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded hover:bg-destructive/10 flex items-center justify-center" title="删除">
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>
      <h3 className="font-medium mt-4 truncate">{project.name}</h3>
      <p className="text-xs text-muted-foreground mt-3">创建于 {new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(project.created_at))}</p>
      <Button className="w-full mt-5 gap-2" size="sm" onClick={onOpen}>
        <FolderOpen className="w-4 h-4" />打开项目
      </Button>
    </div>
  );
}