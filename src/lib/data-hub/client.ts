import { appwrite } from "@/lib/appwrite/client";

const baseUrl = (process.env.NEXT_PUBLIC_DATA_HUB_API_URL ?? "https://storage.amcmep.in/v1").replace(/\/$/, "");
const projectKey = "amcmep";

export async function dataHubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await appwrite.account.createJWT();
  const response = await fetch(`${baseUrl}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Data-Project": projectKey,
      Authorization: `Bearer ${token.jwt}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error((await response.text()) || `Data Hub request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}
