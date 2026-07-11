"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { ArrowRight, HelpCircle, Lock, Mail, QrCode, ShieldCheck, Smartphone } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, activeRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && activeRole !== "guest") router.replace("/");
  }, [activeRole, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Enter your email and password");
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      router.replace("/");
    } catch (err: any) {
      toast.error(err.message || "Email or password is incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Card className="rounded-lg border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-5 sm:p-8">
          <div className="mb-6">
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-black text-slate-950">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Access your AMC MEP account securely.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              icon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              icon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" size="lg" isLoading={isLoading}>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold text-slate-400">Other options</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="h-auto rounded-lg justify-start p-4 text-left" onClick={() => router.push("/qr-login")}> 
              <QrCode className="h-5 w-5 text-blue-600" />
              <span>
                <span className="block text-sm font-bold">QR approval</span>
                <span className="block text-xs font-medium text-slate-500">Use mobile app</span>
              </span>
            </Button>
            <Button variant="outline" className="h-auto rounded-lg justify-start p-4 text-left" onClick={() => router.push("/phone-auth")}> 
              <Smartphone className="h-5 w-5 text-slate-700" />
              <span>
                <span className="block text-sm font-bold">SIM profile</span>
                <span className="block text-xs font-medium text-slate-500">Mobile only</span>
              </span>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-sm">
            <span className="text-slate-500">New to AMC MEP?</span>
            <button onClick={() => router.push("/register")} className="font-bold text-blue-700 hover:text-blue-800">
              Create an account
            </button>
          </div>
        </CardContent>
      </Card>
      <button onClick={() => window.location.assign("https://www.amcmep.in/support")} className="mx-auto mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <HelpCircle className="h-4 w-4" />
        Need help signing in?
      </button>
    </div>
  );
}
