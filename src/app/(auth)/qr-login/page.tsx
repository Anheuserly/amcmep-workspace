"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { consumeApprovedQrLogin, createQrLoginSession, fetchQrLoginSession, type QrLoginSession } from "@/lib/services/authServices";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";

export default function QrLoginPage() {
  const router = useRouter();
  const { completeQrProfileSession } = useAuth();
  const [session, setSession] = useState<QrLoginSession | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Creating secure QR...");
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
  };

  const startSession = async () => {
    stopPolling();
    setIsLoading(true);
    setError("");
    setMessage("Creating secure QR...");
    try {
      const nextSession = await createQrLoginSession();
      const image = await QRCode.toDataURL(nextSession.payload, {
        width: 260,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setSession(nextSession);
      setQrImage(image);
      setMessage("Open AMC MEP 24x7 One on your verified phone and scan this QR.");
      pollingRef.current = setInterval(async () => {
        try {
          const latest = await fetchQrLoginSession(nextSession.token);
          if (!latest) return;
          if (new Date(latest.expiresAt).getTime() < Date.now()) {
            stopPolling();
            setError("This QR expired. Generate a new code.");
            setMessage("");
            return;
          }
          if (latest.status === "approved") {
            stopPolling();
            const profile = await consumeApprovedQrLogin(latest.token);
            completeQrProfileSession(profile);
            toast.success("Device login approved");
            router.replace("/");
          } else if (latest.status === "used" || latest.status === "expired") {
            stopPolling();
            setError(latest.status === "used" ? "This QR was already used." : "This QR expired. Generate a new code.");
            setMessage("");
          }
        } catch {
          setMessage("Waiting for approval from your phone...");
        }
      }, 4000);
    } catch (err: any) {
      setError(err.message || "Unable to create QR login.");
      setMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startSession();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in">
      <button onClick={() => router.push("/login")} className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </button>

      <Card className="border-slate-200 shadow-xl shadow-slate-200/60">
        <CardContent className="p-6 sm:p-7">
          <div className="mb-6">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <QrCode className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Login with QR approval</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">Scan this from the mobile app profile screen on a SIM-verified device.</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex min-h-[292px] items-center justify-center rounded-2xl bg-white p-4 shadow-sm">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="text-sm font-semibold">{message}</span>
                </div>
              ) : qrImage ? (
                <img src={qrImage} alt="AMC MEP QR login code" className="h-[260px] w-[260px]" />
              ) : (
                <QrCode className="h-24 w-24 text-slate-300" />
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex gap-3">
              {error ? <RefreshCw className="mt-0.5 h-5 w-5 text-orange-600" /> : <Smartphone className="mt-0.5 h-5 w-5 text-blue-700" />}
              <div>
                <p className={`text-sm font-bold ${error ? "text-orange-800" : "text-blue-900"}`}>
                  {error || "Waiting for mobile approval"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {error || message || "The browser will continue automatically when the phone approves this login."}
                </p>
              </div>
            </div>
          </div>

          {session && !error && (
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Expires at {new Date(session.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

          <Button variant="outline" className="mt-5 w-full" onClick={startSession} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Generate new QR
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
