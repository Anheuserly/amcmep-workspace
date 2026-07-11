"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchAssignments,
  fetchBusinessMemberships,
  fetchBusinesses,
  fetchPartnerProfile,
  toBusiness,
  toPartnerAssignment,
  toPartnerProfile,
  toWorkspaceMembership,
} from "@/lib/services/appwriteServices";
import toast from "react-hot-toast";
import {
  Briefcase, Building2, Users, CheckCircle, Star, MapPin, Wrench, TrendingUp, Plus, Trash2, Edit3, ArrowRight, Award, IndianRupee, X
} from "lucide-react";
import type { Business, PartnerProfile, PartnerAssignment, WorkspaceMembership } from "@/types";

const roleBadgeColors = { owner: "bg-red-100 text-red-700", admin: "bg-orange-100 text-orange-700", partner: "bg-blue-100 text-blue-700", staff: "bg-gray-100 text-gray-700" };
const assignmentStatusColors = { assigned: "bg-yellow-100 text-yellow-700", in_progress: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

export default function WorkspacePage() {
  const { activeRole, profile } = useAuth();
  const isAdmin = activeRole === "administrator";
  const isPartner = activeRole === "partner";
  const [business, setBusiness] = useState<Business | undefined>();
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | undefined>();
  const [assignments, setAssignments] = useState<PartnerAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinForm, setJoinForm] = useState({ skills: "", serviceAreas: "", partnerType: "service" as const });

  useEffect(() => {
    let alive = true;
    async function loadWorkspace() {
      if (!profile?.userId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [businessDocs, partnerDoc, assignmentDocs] = await Promise.all([
          fetchBusinesses({ ownerId: profile.userId, limit: 20 }),
          fetchPartnerProfile(profile.userId),
          fetchAssignments({ partnerId: profile.userId, limit: 100 }),
        ]);
        if (!alive) return;
        const mappedBusiness = businessDocs.map(toBusiness)[0];
        setBusiness(mappedBusiness);
        setPartnerProfile(partnerDoc ? toPartnerProfile(partnerDoc) : undefined);
        setAssignments(assignmentDocs.map(toPartnerAssignment));
        if (mappedBusiness) {
          const membershipDocs = await fetchBusinessMemberships(mappedBusiness.$id);
          if (alive) setMemberships(membershipDocs.map(toWorkspaceMembership));
        } else {
          setMemberships([]);
        }
      } catch {
        if (alive) toast.error("Unable to load workspace");
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    loadWorkspace();
    return () => { alive = false; };
  }, [profile?.userId]);

  const handleJoinProgram = () => {
    if (!joinForm.skills || !joinForm.serviceAreas) {
      toast.error("Please fill all fields");
      return;
    }
    toast.success("Partner program application submitted!");
    setShowJoinModal(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
        <p className="text-gray-500 mt-1">
          {isAdmin && "Manage your business, team, and incoming work"}
          {isPartner && "Your partner profile, assignments, and earnings"}
          {!isAdmin && !isPartner && "Join our partner program to start earning"}
        </p>
      </div>

      {isLoading && (
        <Card><CardContent className="p-8 text-center text-sm text-gray-500">Loading workspace...</CardContent></Card>
      )}

      {/* ADMIN VIEW */}
      {!isLoading && isAdmin && !business && (
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="No business workspace found" description="Create or connect a business in the app to manage team, requests, and partner work here." />
      )}

      {!isLoading && isAdmin && business && (
        <>
          {/* Business Profile */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="h-20 w-20 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-10 w-10 text-brand-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{business.name}</h2>
                  <p className="text-gray-500 text-sm">{business.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{business.city}, {business.state}</span>
                    <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{business.rating} ({business.reviewCount} reviews)</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />{business.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {business.categories.map((cat) => (
                      <Badge key={cat} variant="default">{cat}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Edit3 className="h-4 w-4 mr-1" />Edit</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-brand-600" />
                Team ({memberships.length} members)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Member</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Role</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Permissions</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Joined</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((m) => (
                      <tr key={m.$id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={`User ${m.userId.slice(-1)}`} size="sm" />
                            <span className="font-medium">User {m.userId.slice(-1)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2"><Badge className={roleBadgeColors[m.role]}>{m.role}</Badge></td>
                        <td className="py-3 px-2"><span className="text-xs text-gray-500">{m.permissions.length} permissions</span></td>
                        <td className="py-3 px-2 text-gray-500">{new Date(m.joinedAt).toLocaleDateString()}</td>
                        <td className="py-3 px-2 text-right">
                          {m.role !== "owner" && (
                            <button className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" className="mt-4" size="sm"><Plus className="h-4 w-4 mr-2" />Add Member</Button>
            </CardContent>
          </Card>

          {/* Incoming Work */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-brand-600" />
                Work Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-3">
                {assignments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-500">No assignments found for this workspace yet.</p>
                ) : assignments.slice(0, 6).map((assignment) => (
                  <div key={assignment.$id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Request #{assignment.requestId || assignment.$id}</p>
                      <p className="text-xs text-gray-500">Assigned {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={assignmentStatusColors[assignment.status]}>{assignment.status.replace(/_/g, " ")}</Badge>
                      <Button size="sm" variant="ghost"><ArrowRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Earnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-brand-600" />
                Earnings Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold text-gray-900">₹{assignments.reduce((sum, item) => sum + item.earnings, 0).toLocaleString("en-IN")}</p><p className="text-xs text-gray-500 mt-1">Assigned Value</p></div>
                <div><p className="text-2xl font-bold text-gray-900">{assignments.filter((item) => item.status === "completed").length}</p><p className="text-xs text-gray-500 mt-1">Completed</p></div>
                <div><p className="text-2xl font-bold text-gray-900">{memberships.length}</p><p className="text-xs text-gray-500 mt-1">Team Members</p></div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* PARTNER VIEW */}
      {!isLoading && isPartner && partnerProfile && (
        <>
          {/* Partner Profile */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="h-20 w-20 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wrench className="h-10 w-10 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{profile?.name || "Partner"}</h2>
                  <p className="text-gray-500 text-sm">{partnerProfile.partnerType} partner • {partnerProfile.status}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{partnerProfile.rating} rating</span>
                    <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" />{partnerProfile.completedJobs} jobs</span>
                    <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4 text-brand-600" />{partnerProfile.earnings.toLocaleString("en-IN")} earned</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {partnerProfile.skills.map((skill) => (
                      <Badge key={skill} variant="default">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-brand-600" />
                Active Assignments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-3">
                {assignments.filter((a) => a.status === "in_progress").map((a) => (
                  <div key={a.$id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Request #{a.requestId}</p>
                      <p className="text-xs text-gray-500">Assigned: {new Date(a.assignedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-brand-600">₹{a.earnings.toLocaleString("en-IN")}</span>
                      <Badge className={assignmentStatusColors[a.status]}>{a.status}</Badge>
                    </div>
                  </div>
                ))}
                {assignments.filter((a) => a.status === "in_progress").length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No active assignments</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Completed Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Completed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-3">
                {assignments.filter((a) => a.status === "completed").map((a) => (
                  <div key={a.$id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">Request #{a.requestId}</p>
                      <p className="text-xs text-gray-500">Completed: {a.completedAt ? new Date(a.completedAt).toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-green-700">₹{a.earnings.toLocaleString("en-IN")}</span>
                      <Badge className={assignmentStatusColors[a.status]}>{a.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* CUSTOMER / GUEST VIEW - Join Partner Program */}
      {!isLoading && !isAdmin && !isPartner && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Join the Partner Program</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Are you a skilled technician, service provider, or vendor? Join our partner network to get access to service requests, earn income, and grow your business.
            </p>
            <Button size="lg" onClick={() => setShowJoinModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Apply Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-bold">Join Partner Program</h2><button onClick={() => setShowJoinModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="p-4 space-y-4">
              <Input label="Skills" placeholder="Your service skills" value={joinForm.skills} onChange={(e) => setJoinForm({ ...joinForm, skills: e.target.value })} />
              <Input label="Service Areas" placeholder="Areas you can serve" value={joinForm.serviceAreas} onChange={(e) => setJoinForm({ ...joinForm, serviceAreas: e.target.value })} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Partner Type</label><select className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={joinForm.partnerType} onChange={(e) => setJoinForm({ ...joinForm, partnerType: e.target.value as any })}><option value="service">Service Partner</option><option value="vendor">Vendor Partner</option><option value="both">Hybrid (Both)</option></select></div>
              <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={() => setShowJoinModal(false)}>Cancel</Button><Button className="flex-1" onClick={handleJoinProgram}>Submit Application</Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
