"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Lock, Mail, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, activeRole } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (isAuthenticated && activeRole !== "guest") router.replace("/");
  }, [activeRole, isAuthenticated, router]);

  useEffect(() => {
    const saved = window.localStorage.getItem("amcmep_referral_code") || "";
    setReferralCode(saved);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Enter your full name");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter your email address");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      await register(email, password, name, referralCode || undefined);
      window.localStorage.removeItem("amcmep_referral_code");
      toast.success("Account created");
      router.replace("/");
    } catch (err: any) {
      toast.error(err.message || "Unable to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.push("/login")} className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </button>

      <Card className="rounded-lg border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <CardContent className="p-5 sm:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-slate-950">Create account</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Set up your secure access to AMC MEP 24x7 One.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {referralCode && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-emerald-700">Referral applied</p>
                <p className="mt-1 font-mono text-sm font-semibold text-emerald-950">{referralCode}</p>
              </div>
            )}
            <Input
              label="Full name"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              icon={<User className="h-4 w-4" />}
            />
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
              placeholder="Create a secure password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="Enter the password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" size="lg" isLoading={isLoading}>
              Create account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            Already registered?{" "}
            <button onClick={() => router.push("/login")} className="font-semibold text-blue-700 hover:text-blue-800">
              Sign in
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
