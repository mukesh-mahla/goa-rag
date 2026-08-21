import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY;
if (!apiKey) {
  console.warn("Warning: PINECONE_API_KEY is not defined in environment variables");
}

export const pinecone = new Pinecone({
  apiKey: apiKey || "",
});

export const pineconeIndexName = "brainly-content";
export const pineconeNamespace = "msmarco-hi";

export const index = pinecone.index(pineconeIndexName).namespace(pineconeNamespace);
