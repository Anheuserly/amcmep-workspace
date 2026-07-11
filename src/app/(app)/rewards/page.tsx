"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Gift, Megaphone, Share2, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { fetchMarketplace, readBool, readString } from "@/lib/services/appwriteServices";

type Promotion = {
  id: string;
  title: string;
  description: string;
  image: string;
};

export default function RewardsPage() {
  const router = useRouter();
  const { profile, activeRole } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [copied, setCopied] = useState(false);
  const referralUrl = useMemo(
    () => profile?.referralCode ? `https://app.amcmep.in/r/${profile.referralCode}` : "",
    [profile?.referralCode],
  );

  useEffect(() => {
    if (activeRole === "guest") {
      router.replace("/login");
      return;
    }
    let alive = true;
    fetchMarketplace({ limit: 120 })
      .then((docs) => {
        if (!alive) return;
        setPromotions(
          docs
            .filter((doc) =>
              readBool(doc, "isFeatured") ||
              readBool(doc, "isPromoted") ||
              readBool(doc, "promoted") ||
              Boolean(readString(doc, "promotionTitle")),
            )
            .map((doc) => ({
              id: doc.$id,
              title: readString(doc, "promotionTitle") || readString(doc, "displayTitle") || readString(doc, "title"),
              description: readString(doc, "promotionText") || readString(doc, "offerText") || readString(doc, "description"),
              image: readString(doc, "imageUrl") || readString(doc, "mediaUrl"),
            })),
        );
      })
      .catch(() => alive && setPromotions([]))
      .finally(() => alive && setLoadingPromotions(false));
    return () => { alive = false; };
  }, [activeRole, router]);

  const copyReferral = async () => {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Referral link copied");
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareReferral = async () => {
    if (!referralUrl) return;
    try {
      if (navigator.share) await navigator.share({ url: referralUrl });
      else await copyReferral();
    } catch {}
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-6 sm:p-8">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-600"><Gift className="h-5 w-5" /></div>
          <h1 className="mt-5 text-3xl font-black text-slate-950">Referral & rewards</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Invite people to your AMC MEP network with your personal link. Successful sign-ups are connected to your profile automatically.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-bold text-slate-800">
              <span className="block truncate">{referralUrl || "Preparing your referral link..."}</span>
            </div>
            <Button variant="outline" onClick={copyReferral} disabled={!referralUrl}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}Copy</Button>
            <Button onClick={shareReferral} disabled={!referralUrl}><Share2 className="h-4 w-4" />Share</Button>
          </div>
        </div>
        <div className="flex items-center bg-slate-950 p-6 text-white sm:p-8">
          <div>
            <Megaphone className="h-7 w-7 text-blue-400" />
            <p className="mt-5 text-xl font-black">One link, automatically tracked</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">People who open your link will see your referral applied before they register.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-black text-slate-950">Current promotions</h2><p className="mt-1 text-sm text-slate-500">Live promoted offers from the marketplace</p></div>
          <Button variant="outline" onClick={() => router.push("/marketplace")}><ShoppingBag className="h-4 w-4" />Marketplace</Button>
        </div>
        {loadingPromotions ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Checking active promotions...</div>
        ) : promotions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 font-bold text-slate-900">No active promotions</p>
            <p className="mt-1 text-sm text-slate-500">New marketplace offers will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promotion) => (
              <button key={promotion.id} onClick={() => router.push("/marketplace")} className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition hover:border-blue-300 hover:shadow-md">
                {promotion.image && <img src={promotion.image} alt="" className="aspect-[16/9] w-full object-cover" />}
                <div className="p-5"><p className="font-black text-slate-950">{promotion.title}</p>{promotion.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{promotion.description}</p>}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
