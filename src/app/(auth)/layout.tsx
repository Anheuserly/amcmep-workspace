import { ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-slate-950 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 lg:block">
        <img
          src="/auth-service-network.png"
          alt="Facility engineer reviewing building services"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/45" />

        <div className="relative z-10 flex min-h-screen flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3 text-white">
            <img
              src="/amcmep-one-icon.png"
              alt="AMC MEP 24x7"
              className="h-11 w-11 rounded-lg border border-white/20 shadow-lg"
            />
            <div>
              <p className="text-sm font-black">AMC MEP 24x7 One</p>
              <p className="text-xs text-white/70">Service network</p>
            </div>
          </div>

          <div className="max-w-xl pb-4 text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-slate-950/35 px-3 py-2 text-xs font-bold backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Secure account access
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl xl:text-6xl">
              Your service network, always within reach.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/80">
              Continue conversations, follow maintenance activity, and stay connected with the people handling your services.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-5 flex items-center gap-3 sm:mb-7 lg:hidden">
            <img src="/amcmep-one-icon.png" alt="AMC MEP 24x7" className="h-11 w-11 rounded-lg shadow-sm" />
            <div>
              <p className="text-sm font-black text-slate-950">AMC MEP 24x7 One</p>
              <p className="text-xs text-slate-500">Secure account access</p>
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
