import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { Client } from "pg";

const clusterEndpoint = process.env.DSQL_CLUSTER_URL!;
const region = process.env.REGION!;

async function getToken() {
  // The token expiration time is optional, and the default value 900 seconds
  const signer = new DsqlSigner({
    hostname: clusterEndpoint,
    region,
  });
  const token = await signer.getDbConnectAdminAuthToken();
  return token;
}

let client: Client | null = null;
let current = 0;

export async function getDatabaseClient() {
  const diff = Date.now() - current;
  if (client && diff < 850000) {
    return client;
  }
  current = Date.now();
  const token = await getToken();
  client = new Client({
    host: clusterEndpoint,
    user: "admin",
    password: token,
    database: "postgres",
    port: 5432,
    ssl: true,
  });

  // Connect
  await client.connect();
  return client;
}

export const ddbDocClient = {};
export const tableName = "invoices";
