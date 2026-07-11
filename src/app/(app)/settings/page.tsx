"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Globe,
  Bell,
  Shield,
  Smartphone,
  Trash2,
  Moon,
  Sun,
} from "lucide-react";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "fr", label: "French" },
  { code: "zh", label: "Chinese" },
  { code: "ms", label: "Malay" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "de", label: "German" },
];

export default function SettingsPage() {
  const { logout, profile } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    chat: true,
    requests: true,
    amc: true,
    promotions: false,
    payments: true,
  });

  const handleDeleteAccount = () => {
    window.location.href = "https://amcmep.in/delete-account";
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-brand-600" />
            Language
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  profile?.preferredLanguage === lang.code
                    ? "bg-brand-100 text-brand-700"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-brand-600" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          {Object.entries(notifications).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">{key} notifications</p>
                <p className="text-xs text-gray-500">
                  {key === "chat" && "Receive alerts for new messages"}
                  {key === "requests" && "Updates on your service requests"}
                  {key === "amc" && "AMC contract reminders and renewals"}
                  {key === "promotions" && "Marketing and promotional offers"}
                  {key === "payments" && "Payment confirmations and invoices"}
                </p>
              </div>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [key]: !enabled }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  enabled ? "bg-brand-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                  style={{ transform: enabled ? "translateX(20px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-brand-600" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-3">
          <Button variant="outline" className="w-full justify-start">
            Change Password
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Two-Factor Authentication
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Active Sessions
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-danger">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
