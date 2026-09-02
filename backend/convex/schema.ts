import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { inventoryStatus, legacyInventoryStatus } from "./inventoryStatus";

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
    // Optional so items can be captured quickly without deciding on a room.
    room: v.optional(v.string()),
    quantity: v.number(),
    // Legacy values remain accepted during the rolling data migration. Remove
    // legacyInventoryStatus after migrateLegacyStatuses has rewritten all rows.
    status: v.union(inventoryStatus, legacyInventoryStatus),
    marketplaceLink: v.optional(v.string()),
    donationLocation: v.optional(v.string()),
    owner: v.optional(v.string()),
    destination: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Optional so inventory records created before photo uploads remain valid.
    images: v.optional(v.array(v.id("_storage"))),
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

  marketplaceClaims: defineTable({
    inventoryId: v.id("inventory"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_inventoryId", ["inventoryId"]),

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
    // Optional so notes created before manual ordering was added keep their
    // existing position until the first reorder.
    sortOrder: v.optional(v.number()),
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
