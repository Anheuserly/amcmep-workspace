import { notFound } from "next/navigation";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";

const sections = new Set(["business","team","partners","departments","roles","projects","sites","clients","vendors","tasks","services","invoices","proforma-invoices","payments","expenses","quotations","purchase-orders","work-orders","reports","documents","templates","files","business-settings","integrations","account-settings"]);

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ workspaceSection: string }> }) {
  const { workspaceSection } = await params;
  if (!sections.has(workspaceSection)) notFound();
  return <WorkspaceSection section={workspaceSection} />;
}
