import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { askGlobalKnowledge } from "./src/services/Ai/vectorStore.ai.service";

async function run() {
  try {
    console.log("Connecting to Mongo...");
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is missing in .env");
    }
    await mongoose.connect(uri);
    console.log("Connected! Calling askGlobalKnowledge...");
    const ans = await askGlobalKnowledge("Hello");
    console.log("Answer:", ans);
  } catch (err) {
    console.error("ERROR DETECTED:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
