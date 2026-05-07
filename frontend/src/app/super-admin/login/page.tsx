"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2 } from "lucide-react";
import { useSALogin } from "@/hooks/use-super-admin";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const login = useSALogin();
  const setAuth = useSuperAdminAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          setAuth(data.superAdmin, data.accessToken);
          router.push("/super-admin/dashboard");
        },
        onError: (err: any) => {
          setError(err?.response?.data?.message ?? "Invalid credentials");
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Flame className="h-7 w-7 text-primary" />
            <span className="text-on-surface font-bold text-xl">Wazelo CRM</span>
          </div>
          <p className="text-on-surface-variant text-sm">Super Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 py-2.5 text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="superadmin@wazelo.in"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-surface-container border border-outline-variant text-on-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="text-error text-sm bg-error/10 border border-error/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
