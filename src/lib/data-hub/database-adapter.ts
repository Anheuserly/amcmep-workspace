type JwtProvider = () => Promise<string>;

const baseUrl = (process.env.NEXT_PUBLIC_DATA_HUB_API_URL ?? "https://storage.amcmep.in/v1").replace(/\/$/, "");

export class DataHubDatabaseAdapter {
  constructor(private readonly jwt: JwtProvider) {}

  async listDocuments<T extends Models.Document = Models.Document>(_databaseId: string, collectionId: string, queries: string[] = []): Promise<Models.DocumentList<T>> {
    const search = new URLSearchParams();
    queries.forEach((query) => search.append("query", query));
    return this.request(`records/${encodeURIComponent(collectionId)}?${search}`) as Promise<Models.DocumentList<T>>;
  }
  async getDocument<T extends Models.Document = Models.Document>(_databaseId: string, collectionId: string, documentId: string): Promise<T> {
    return this.request(`records/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`) as Promise<T>;
  }
  async createDocument<T extends Models.Document = Models.Document>(_databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>): Promise<T> {
    return this.request(`records/${encodeURIComponent(collectionId)}`, { method: "POST", body: JSON.stringify({ id: documentId, data }) }) as Promise<T>;
  }
  async updateDocument<T extends Models.Document = Models.Document>(_databaseId: string, collectionId: string, documentId: string, data: Record<string, unknown>): Promise<T> {
    return this.request(`records/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`, { method: "PATCH", body: JSON.stringify({ data }) }) as Promise<T>;
  }
  async deleteDocument(_databaseId: string, collectionId: string, documentId: string): Promise<any> {
    return this.request(`records/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`, { method: "DELETE" });
  }
  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const response = await fetch(`${baseUrl}/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Data-Project": "amcmep", Authorization: `Bearer ${await this.jwt()}`, ...init.headers },
    });
    if (!response.ok) throw new Error((await response.text()) || `Data Hub request failed (${response.status}).`);
    return response.json();
  }
}
import type { Models } from "appwrite";
