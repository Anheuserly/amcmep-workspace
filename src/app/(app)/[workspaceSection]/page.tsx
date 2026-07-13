import { notFound } from "next/navigation";
import { Building2, ClipboardList, FileText, Settings, ShieldCheck, Users, WalletCards } from "lucide-react";

const sections = {
  business: { title: "My business", description: "Business identity, capabilities, locations, verification, and public information.", icon: Building2, items: ["Business profile", "Service and vendor capabilities", "Locations and coverage", "Verification status"] },
  team: { title: "Partners & team", description: "People connected through active business membership records.", icon: Users, items: ["Active members", "Owner and administrator access", "Partner availability", "Workspace permissions"] },
  projects: { title: "Work & projects", description: "Accepted requests, assignments, field activity, and completion records.", icon: ClipboardList, items: ["Open service work", "Partner assignments", "Site visits", "Completion history"] },
  services: { title: "AMC & services", description: "Maintenance contracts, scheduled service activity, and customer work.", icon: ShieldCheck, items: ["AMC records", "Upcoming visits", "Service requests", "Inspection reports"] },
  finance: { title: "Finance", description: "Assignment values and business financial records when they are available.", icon: WalletCards, items: ["Assigned value", "Payments", "Invoices", "Expenses and quotations"] },
  documents: { title: "Documents", description: "Workspace reports, business files, and field documentation.", icon: FileText, items: ["Inspection reports", "Service documents", "Business files", "Media uploads"] },
  "business-settings": { title: "Business settings", description: "Workspace preferences and business-level controls.", icon: Settings, items: ["Business preferences", "Member permissions", "Notifications", "Integrations"] },
} as const;

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ workspaceSection: string }> }) {
  const { workspaceSection } = await params;
  const section = sections[workspaceSection as keyof typeof sections];
  if (!section) notFound();
  const Icon = section.icon;
  return <div className="space-y-6"><header className="border-b border-slate-200 pb-5"><p className="text-xs font-bold uppercase text-blue-600">Workspace</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{section.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{section.description}</p></header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{section.items.map((item) => <article key={item} className="rounded-lg border border-slate-200 bg-white p-5"><div className="grid size-10 place-items-center rounded-md bg-blue-50 text-blue-600"><Icon size={19} /></div><h2 className="mt-4 text-sm font-bold text-slate-900">{item}</h2><p className="mt-2 text-xs leading-5 text-slate-500">This area uses live workspace records when matching data is available.</p></article>)}</section><section className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Icon className="mx-auto text-slate-300" size={32} /><h2 className="mt-4 text-base font-bold text-slate-900">No additional records to show</h2><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">New records connected to the active business will appear here. No demonstration data is shown.</p></section></div>;
}
