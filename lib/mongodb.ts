import { MongoClient } from "mongodb";
import type { MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

let client: MongoClient | null = null;

export const getMongoClient = async () => {
  if (client) return client;
  if (globalForMongo._mongoClientPromise) {
    client = await globalForMongo._mongoClientPromise;
    return client;
  }
  const options: MongoClientOptions = {};
  const tlsEnv = process.env.MONGODB_TLS;
  const tlsInsecure = process.env.MONGODB_TLS_INSECURE === "true";

  if (typeof tlsEnv !== "undefined") {
    options.tls = tlsEnv === "true";
  }

  if (tlsInsecure) {
    options.tlsAllowInvalidCertificates = true;
    options.tlsAllowInvalidHostnames = true;
  }

  if (uri.includes("localhost") || uri.includes("127.0.0.1")) {
    options.tls = false;
  }

  const newClient = new MongoClient(uri, options);
  globalForMongo._mongoClientPromise = newClient.connect().then(() => newClient);
  client = await globalForMongo._mongoClientPromise;
  return client;
};

export const getDb = async () => {
  const mongoClient = await getMongoClient();
  return mongoClient.db();
};
