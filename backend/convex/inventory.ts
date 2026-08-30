import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./auth";
import { internal } from "./_generated/api";
import {
  initialStatus,
  inventoryStatus,
  isFinishedStatus,
  isStatusForCategory,
  normalizeInventoryStatus,
  type LegacyInventoryStatus,
} from "./inventoryStatus";

const inventoryCategory = v.union(
  v.literal("ship"),
  v.literal("sell"),
  v.literal("donate"),
  v.literal("trash"),
  v.literal("store"),
);

export const MAX_IMAGES_PER_ITEM = 6;

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const items = await ctx.db
      .query("inventory")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
    return items.map((item) => ({
      ...item,
      status: normalizeInventoryStatus(item.category, item.status),
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: inventoryCategory,
    room: v.string(),
    quantity: v.number(),
    marketplaceLink: v.optional(v.string()),
    donationLocation: v.optional(v.string()),
    owner: v.optional(v.string()),
    destination: v.optional(v.string()),
    notes: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const name = args.name.trim();
    const room = args.room.trim();

    if (!name) throw new Error("Name cannot be empty");
    if (!room) throw new Error("Room cannot be empty");
    if (!Number.isInteger(args.quantity) || args.quantity < 1) {
      throw new Error("Quantity must be a positive whole number");
    }
    if (args.estimatedValue !== undefined && (!Number.isFinite(args.estimatedValue) || args.estimatedValue < 0)) {
      throw new Error("Asking price cannot be negative");
    }

    const now = Date.now();
    const optionalText = (value: string | undefined) => value?.trim() || undefined;

    return await ctx.db.insert("inventory", {
      name,
      category: args.category,
      room,
      quantity: args.quantity,
      status: initialStatus(args.category),
      marketplaceLink: optionalText(args.marketplaceLink),
      donationLocation: optionalText(args.donationLocation),
      owner: optionalText(args.owner),
      destination: optionalText(args.destination),
      notes: optionalText(args.notes),
      estimatedValue: args.estimatedValue,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const get = query({
  args: { id: v.id("inventory") },
  handler: async (ctx, { id }) => {
    await requireAuthenticatedUser(ctx);
    const item = await ctx.db.get(id);
    return item ? { ...item, status: normalizeInventoryStatus(item.category, item.status) } : null;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addImage = mutation({
  args: { id: v.id("inventory"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    await requireAuthenticatedUser(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Item not found");

    const images = existing.images ?? [];
    if (images.includes(storageId)) return null;
    if (images.length >= MAX_IMAGES_PER_ITEM) {
      throw new Error(`Maximum of ${MAX_IMAGES_PER_ITEM} photos per item`);
    }

    const file = await ctx.db.system.get("_storage", storageId);
    if (!file) throw new Error("Photo upload not found");
    if (!file.contentType?.startsWith("image/")) {
      throw new Error("Only image uploads can be attached to an item");
    }

    await ctx.db.patch(id, { images: [...images, storageId], updatedAt: Date.now() });
    return null;
  },
});

/** Remove an uploaded file when attaching it to an item did not complete. */
export const discardImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireAuthenticatedUser(ctx);
    await ctx.storage.delete(storageId);
    return null;
  },
});

export const removeImage = mutation({
  args: { id: v.id("inventory"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    await requireAuthenticatedUser(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Item not found");

    const images = existing.images ?? [];
    if (!images.includes(storageId)) return null;

    await ctx.db.patch(id, {
      images: images.filter((image) => image !== storageId),
      updatedAt: Date.now(),
    });
    await ctx.storage.delete(storageId);
    return null;
  },
});

export const imageUrls = query({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) => {
    await requireAuthenticatedUser(ctx);

    const urls: Record<string, string | null> = {};
    for (const id of ids) urls[id] = await ctx.storage.getUrl(id);
    return urls;
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory"),
    name: v.string(),
    category: inventoryCategory,
    room: v.string(),
    quantity: v.number(),
    status: inventoryStatus,
    marketplaceLink: v.optional(v.string()),
    donationLocation: v.optional(v.string()),
    owner: v.optional(v.string()),
    destination: v.optional(v.string()),
    notes: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    soldPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Item not found");

    const name = args.name.trim();
    const room = args.room.trim();
    if (!name) throw new Error("Name cannot be empty");
    if (!room) throw new Error("Room cannot be empty");
    if (!Number.isInteger(args.quantity) || args.quantity < 1) {
      throw new Error("Quantity must be a positive whole number");
    }
    if (!isStatusForCategory(args.category, args.status)) {
      throw new Error("That status does not belong to the selected item type");
    }
    for (const [label, value] of [["Asking price", args.estimatedValue], ["Sold price", args.soldPrice]] as const) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new Error(`${label} cannot be negative`);
      }
    }

    const optionalText = (value: string | undefined) => value?.trim() || undefined;
    const completedAt = isFinishedStatus(args.status)
      ? existing.completedAt ?? Date.now()
      : undefined;

    const claim = await ctx.db
      .query("marketplaceClaims")
      .withIndex("by_inventoryId", (q) => q.eq("inventoryId", args.id))
      .first();
    if (claim && (
      (args.category !== "sell" && args.category !== "donate") ||
      (args.category === "donate" && args.status === "available")
    )) {
      await ctx.db.delete(claim._id);
    }

    await ctx.db.patch(args.id, {
      name,
      category: args.category,
      room,
      quantity: args.quantity,
      status: args.status,
      marketplaceLink: optionalText(args.marketplaceLink),
      donationLocation: optionalText(args.donationLocation),
      owner: optionalText(args.owner),
      destination: optionalText(args.destination),
      notes: optionalText(args.notes),
      estimatedValue: args.estimatedValue,
      soldPrice: args.soldPrice,
      completedAt,
      updatedAt: Date.now(),
    });
  },
});

const legacyStatuses: LegacyInventoryStatus[] = ["pending", "in_progress", "complete"];
const MIGRATION_BATCH_SIZE = 100;

async function migrateStatusBatch(ctx: MutationCtx) {
  let migrated = 0;
  for (const legacyStatus of legacyStatuses) {
    const remaining = MIGRATION_BATCH_SIZE - migrated;
    if (remaining === 0) break;
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_status", (q) => q.eq("status", legacyStatus))
      .take(remaining);

    for (const item of items) {
      const claim = item.category === "donate"
        ? await ctx.db.query("marketplaceClaims").withIndex("by_inventoryId", (q) => q.eq("inventoryId", item._id)).first()
        : null;
      await ctx.db.patch(item._id, {
        status: normalizeInventoryStatus(item.category, item.status, Boolean(claim)),
      });
      migrated += 1;
    }
  }
  return migrated;
}

/** Authenticated, idempotent entry point for the one-time legacy status migration. */
export const migrateLegacyStatuses = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    await ctx.scheduler.runAfter(0, internal.inventory.migrateLegacyStatusesBatch, {});
    return null;
  },
});

export const migrateLegacyStatusesBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const migrated = await migrateStatusBatch(ctx);
    if (migrated === MIGRATION_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.inventory.migrateLegacyStatusesBatch, {});
    }
    return null;
  },
});
