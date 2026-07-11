"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { ArrowRight, QrCode, UserPlus, X } from "lucide-react";

const PROMPT_DISMISSED_KEY = "amcmep_guest_auth_prompt_dismissed";

export function GuestAuthPrompt() {
  const router = useRouter();
  const { activeRole, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading || activeRole !== "guest") {
      setVisible(false);
      return;
    }

    if (typeof window !== "undefined" && sessionStorage.getItem(PROMPT_DISMISSED_KEY) === "true") {
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 3500);
    return () => window.clearTimeout(timer);
  }, [activeRole, isLoading]);

  const close = () => {
    sessionStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    setVisible(false);
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-slate-950/20">
        <button
          onClick={close}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Continue browsing"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <img src="/amcmep-one-icon.png" alt="AMC MEP 24x7" className="h-12 w-12 rounded-2xl shadow-sm" />
            <div>
              <p className="text-sm font-bold text-blue-700">AMC MEP 24x7 One</p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">Browse as guest</h2>
            </div>
          </div>

          <p className="text-sm leading-6 text-slate-600">
            You can keep exploring the community, marketplace, and public service updates.
            Sign in when you want to create requests, post updates, chat, or manage AMC records.
          </p>

          <div className="mt-6 grid gap-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => go("/login")}>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => go("/register")}>
                <UserPlus className="h-5 w-5 text-blue-600" />
                <span>
                  <span className="block text-sm font-bold">Create account</span>
                  <span className="block text-xs font-medium text-slate-500">Start fresh</span>
                </span>
              </Button>
              <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => go("/qr-login")}>
                <QrCode className="h-5 w-5 text-blue-600" />
                <span>
                  <span className="block text-sm font-bold">QR approval</span>
                  <span className="block text-xs font-medium text-slate-500">Use mobile app</span>
                </span>
              </Button>
            </div>
            <button onClick={close} className="h-11 rounded-xl text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
              Continue browsing
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
