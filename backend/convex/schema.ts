import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  inventory: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("ship"),
      v.literal("sell"),
      v.literal("donate"),
      v.literal("trash"),
      v.literal("store"),
    ),
    room: v.string(),
    quantity: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("complete"),
    ),
    marketplaceLink: v.optional(v.string()),
    donationLocation: v.optional(v.string()),
    owner: v.optional(v.string()),
    destination: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Kept optional for existing inventory records that already have image IDs.
    images: v.optional(v.array(v.string())),
    estimatedValue: v.optional(v.number()),
    soldPrice: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_room", ["room"])
    .index("by_status", ["status"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_category_and_room", ["category", "room"]),

  stickyNotes: defineTable({
    title: v.string(),
    content: v.string(),
    // Optional so notes created before colour selection was added remain valid.
    color: v.optional(
      v.union(
        v.literal("butter"),
        v.literal("mint"),
        v.literal("sky"),
        v.literal("blush"),
        v.literal("lavender"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_updatedAt", ["updatedAt"]),

  todos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.union(v.literal("incomplete"), v.literal("complete")),
    dueDate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
});
