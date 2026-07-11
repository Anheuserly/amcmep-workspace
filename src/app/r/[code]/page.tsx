"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Gift, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ReferralLandingPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = useMemo(() => {
    const raw = Array.isArray(params.code) ? params.code[0] : params.code;
    return (raw || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 32);
  }, [params.code]);

  useEffect(() => {
    if (code) window.localStorage.setItem("amcmep_referral_code", code);
  }, [code]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <img src="/amcmep-one-icon.png" alt="AMC MEP 24x7" className="h-11 w-11 rounded-lg" />
          <div>
            <p className="font-black text-slate-950">AMC MEP 24x7 One</p>
            <p className="text-xs text-slate-500">Services, community, and AMC care</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-blue-600 p-7 text-white sm:p-9">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/15">
              <Gift className="h-6 w-6" />
            </div>
            <h1 className="mt-6 text-3xl font-black leading-tight">You have been invited to AMC MEP.</h1>
            <p className="mt-3 text-sm leading-6 text-blue-100">
              Join the service network, discover trusted businesses, and keep your maintenance activity in one place.
            </p>
          </div>

          <div className="p-7 sm:p-9">
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-bold uppercase text-emerald-700">Referral ready</p>
              <p className="mt-1 font-mono text-base font-black text-emerald-950">{code || "INVALID CODE"}</p>
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" /><span>Your referral is attached securely when you create an account.</span></div>
              <div className="flex gap-3"><Users className="mt-0.5 h-5 w-5 text-blue-600" /><span>After joining, you can invite people from your own Rewards page.</span></div>
            </div>
            <Button
              size="lg"
              className="mt-8 w-full bg-blue-600 hover:bg-blue-700"
              disabled={!code}
              onClick={() => router.push("/register")}
            >
              Accept invitation
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button onClick={() => router.push("/")} className="mt-4 w-full text-sm font-semibold text-slate-500 hover:text-slate-900">
              Explore as guest
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
