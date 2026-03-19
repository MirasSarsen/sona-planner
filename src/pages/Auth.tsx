import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const submit = async () => {
    if (!email || !password) return setError("Заполните все поля");
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess("Аккаунт создан! Можете войти.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Неверный email или пароль");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <p className="text-2xl mb-1">📋</p>
            <h1 className="text-lg font-semibold">Task Manager</h1>
            <p className="text-sm text-muted-foreground">Supabase Auth</p>
          </div>

          {/* Переключатель режима */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${mode === "signin" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              Войти
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${mode === "signup" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              Регистрация
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Пароль</Label>
              <Input
                type="password"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-md">
                {success}
              </p>
            )}

            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading ? "Загрузка..." : mode === "signin" ? "Войти" : "Создать аккаунт"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
