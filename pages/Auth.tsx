import React, { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Auth() {
  const [, navigate] = useLocation();
  const [isRegister] = useRoute("/register");
  const { signIn, signUp } = useAuth();
  
  const [mode, setMode] = useState<"login" | "register">(isRegister ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("请输入邮箱"); return; }
    if (password.length < 6) { toast.error("密码至少需要 6 位"); return; }
    if (mode === "register" && password !== confirmPassword) { toast.error("两次输入的密码不一致"); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        const result = await signIn(email, password);
        if (result.error) { toast.error(result.error.message); return; }
        toast.success("登录成功");
        navigate("/projects");
      } else {
        const result = await signUp(email, password);
        if (result.error) { toast.error(result.error.message); return; }
        if (result.needsEmailConfirmation) {
          toast.success("注册成功，请检查邮箱并完成验证");
        } else {
          toast.success("注册成功");
          navigate("/projects");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl mb-4">PDF</div>
          <h1 className="text-2xl font-semibold">Test-PDF Editor</h1>
          <p className="text-sm text-muted-foreground mt-1">专业的 PDF 标注与管理工具</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <div className="flex border-b border-border mb-6">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 py-3 text-sm ${mode === "login" ? "text-primary border-b-2 border-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>登录</button>
            <button type="button" onClick={() => setMode("register")} className={`flex-1 py-3 text-sm ${mode === "register" ? "text-primary border-b-2 border-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>注册</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>邮箱</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" autoComplete="email" />
            </div>
            <div>
              <Label>密码</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" className="mt-1.5" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </div>
            {mode === "register" && (
              <div>
                <Label>确认密码</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入密码" className="mt-1.5" autoComplete="new-password" />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "处理中..." : mode === "login" ? "登录" : "创建账户"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button type="button" className="text-sm text-muted-foreground hover:text-primary" onClick={() => navigate("/")}>返回首页</button>
          </div>
        </div>
      </div>
    </div>
  );
}