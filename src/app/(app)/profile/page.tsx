"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import {
  isPublicUserIdAvailable,
  normalizePublicUserId,
  updateClientProfile,
  validatePublicUserId,
} from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Edit3,
  Camera,
  Copy,
  Check,
  UserCircle,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [publicUserId, setPublicUserId] = useState(profile?.customerId || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(profile?.name || "");
    setPhone(profile?.phone || "");
    setCity(profile?.city || "");
    setPublicUserId(profile?.customerId || "");
  }, [profile]);

  const handleCopyReferral = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(`${window.location.origin}/r/${profile.referralCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Referral link copied");
    }
  };

  const handleSave = async () => {
    if (!profile?.$id) return;
    const publicIdCheck = validatePublicUserId(publicUserId);
    if (!publicIdCheck.valid) {
      toast.error(publicIdCheck.message);
      return;
    }
    setIsSaving(true);
    try {
      const available = await isPublicUserIdAvailable(publicIdCheck.value, profile.$id);
      if (!available) {
        toast.error("This user ID is already taken");
        return;
      }
      await updateClientProfile(profile.$id, {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        customerId: publicIdCheck.value,
        updatedAt: new Date().toISOString(),
      });
      await refreshProfile();
      setIsEditing(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Unable to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar
                src={profile?.avatar}
                name={profile?.name || "User"}
                size="xl"
              />
              <button className="absolute bottom-0 right-0 p-1.5 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              {isEditing ? (
                <div className="grid gap-2 max-w-xs mx-auto sm:mx-0">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <Input
                    value={publicUserId}
                    onChange={(e) => setPublicUserId(normalizePublicUserId(e.target.value))}
                    placeholder="Public user ID"
                  />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{profile?.name || "User"}</h1>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-500">{profile?.email || "Add email in the app"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserCircle className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">User ID</p>
              <p className="text-sm text-gray-500">{profile?.customerId || "Set a public user ID"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Phone</p>
              <p className="text-sm text-gray-500">{profile?.phone || "Add phone in the app"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Location</p>
              <p className="text-sm text-gray-500">
                {[profile?.city, profile?.state, profile?.country || "India"].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Language</p>
              <p className="text-sm text-gray-500 capitalize">{profile?.preferredLanguage || "English"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral */}
      {profile?.referralCode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Referral Code</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm text-gray-700">
                {profile.referralCode}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyReferral}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={() => router.push("/rewards")}>Open rewards</Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
