import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    endpoint: v.string(),
    keys: v.object({ p256dh: v.string(), auth: v.string() }),
    createdAt: v.number(),
    // Optional: tag by user or device later
  })
    .index("by_endpoint", ["endpoint"]),
});


