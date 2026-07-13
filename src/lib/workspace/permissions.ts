import type { WorkspaceMembership } from "@/types";

export type WorkspacePermission =
  | "business.view" | "business.manage" | "team.view" | "team.manage" | "roles.manage"
  | "projects.view" | "projects.manage" | "sites.view" | "clients.view" | "vendors.view"
  | "tasks.view" | "tasks.manage" | "services.view" | "services.manage"
  | "finance.view" | "finance.manage" | "documents.view" | "documents.manage"
  | "reports.view" | "settings.manage";

export const roleDefinitions: Record<WorkspaceMembership["role"], { label: string; description: string; permissions: WorkspacePermission[] }> = {
  owner: { label: "Owner", description: "Full control, including team access and business settings.", permissions: ["business.view","business.manage","team.view","team.manage","roles.manage","projects.view","projects.manage","sites.view","clients.view","vendors.view","tasks.view","tasks.manage","services.view","services.manage","finance.view","finance.manage","documents.view","documents.manage","reports.view","settings.manage"] },
  administrator: { label: "Administrator", description: "Runs workspace operations and manages the team.", permissions: ["business.view","business.manage","team.view","team.manage","roles.manage","projects.view","projects.manage","sites.view","clients.view","vendors.view","tasks.view","tasks.manage","services.view","services.manage","finance.view","documents.view","documents.manage","reports.view","settings.manage"] },
  project_manager: { label: "Project manager", description: "Manages projects, sites, clients, tasks, and service delivery.", permissions: ["business.view","team.view","projects.view","projects.manage","sites.view","clients.view","vendors.view","tasks.view","tasks.manage","services.view","services.manage","documents.view","documents.manage","reports.view"] },
  accounts: { label: "Accounts", description: "Handles invoices, payments, expenses, quotations, and reports.", permissions: ["business.view","clients.view","vendors.view","projects.view","finance.view","finance.manage","documents.view","documents.manage","reports.view"] },
  hr: { label: "Human resources", description: "Manages people, departments, attendance, and team records.", permissions: ["business.view","team.view","team.manage","projects.view","tasks.view","documents.view"] },
  technician: { label: "Technician", description: "Views assigned sites, tasks, service work, and field documents.", permissions: ["projects.view","sites.view","tasks.view","tasks.manage","services.view","documents.view","documents.manage"] },
  partner: { label: "Partner", description: "Accesses shared work, assigned services, quotations, and documents.", permissions: ["business.view","projects.view","sites.view","tasks.view","services.view","finance.view","documents.view"] },
  viewer: { label: "Viewer", description: "Read-only access to permitted workspace records.", permissions: ["business.view","projects.view","sites.view","tasks.view","services.view","documents.view","reports.view"] },
};

export function effectivePermissions(membership?: WorkspaceMembership | null): Set<string> {
  if (!membership) return new Set();
  const role = membership.role === ("admin" as WorkspaceMembership["role"]) ? "administrator" : membership.role;
  return new Set([...(roleDefinitions[role]?.permissions ?? []), ...membership.permissions]);
}

export function can(membership: WorkspaceMembership | null | undefined, permission: WorkspacePermission) {
  return effectivePermissions(membership).has(permission);
}
