import { Account, Client, Databases, Storage, Avatars } from "appwrite";

import { appwriteConfig } from "./config";

export function createAppwriteClient() {
  return new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);
}

export function createAppwriteServices() {
  const client = createAppwriteClient();

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
    avatars: new Avatars(client),
  };
}

export const appwrite = createAppwriteServices();
