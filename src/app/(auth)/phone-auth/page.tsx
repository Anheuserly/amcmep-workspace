"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft, Mail, QrCode, ShieldCheck, Smartphone } from "lucide-react";

export default function PhoneAuthPage() {
  const router = useRouter();

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.push("/login")} className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </button>

      <Card className="border-slate-200 shadow-xl shadow-slate-200/60">
        <CardContent className="p-6 sm:p-7">
          <div className="mb-6">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">SIM profile verification</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              The mobile app verifies a phone profile by detecting the installed SIM. Browsers cannot securely read installed SIM details, so this web app does not use OTP login.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 text-blue-700" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Use the AMC MEP 24x7 One mobile app</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Open the app on the phone with your installed SIM, complete contact profile setup, then approve this browser with QR login.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div>
                  <p className="text-sm font-bold text-emerald-950">Why no OTP here?</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">The Flutter app blocks manual phone numbers and accepts only a readable installed SIM. A web OTP would be a different security model.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/qr-login")}>
              <QrCode className="h-4 w-4" />
              QR approval
            </Button>
            <Button variant="outline" onClick={() => router.push("/login")}>
              <Mail className="h-4 w-4" />
              Email login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
