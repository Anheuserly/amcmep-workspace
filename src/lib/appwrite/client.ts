import { Account, Client, Storage, Avatars } from "appwrite";

import { appwriteConfig } from "./config";
import { DataHubDatabaseAdapter } from "@/lib/data-hub/database-adapter";

export function createAppwriteClient() {
  return new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);
}

export function createAppwriteServices() {
  const client = createAppwriteClient();
  const account = new Account(client);

  return {
    client,
    account,
    databases: new DataHubDatabaseAdapter(async () => (await account.createJWT()).jwt),
    storage: new Storage(client),
    avatars: new Avatars(client),
  };
}

export const appwrite = createAppwriteServices();
