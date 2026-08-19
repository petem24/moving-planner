import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "./auth";

const inventoryCategory = v.union(
  v.literal("ship"),
  v.literal("sell"),
  v.literal("donate"),
  v.literal("trash"),
  v.literal("store"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    return await ctx.db
      .query("inventory")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
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
      status: "pending",
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
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory"),
    name: v.string(),
    category: inventoryCategory,
    room: v.string(),
    quantity: v.number(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("complete")),
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
    for (const [label, value] of [["Asking price", args.estimatedValue], ["Sold price", args.soldPrice]] as const) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new Error(`${label} cannot be negative`);
      }
    }

    const optionalText = (value: string | undefined) => value?.trim() || undefined;
    const completedAt = args.status === "complete"
      ? existing.completedAt ?? Date.now()
      : undefined;

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
