import { mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./auth";

const publicItem = async (
  ctx: QueryCtx,
  item: Doc<"inventory">,
) => {
  const claim = await ctx.db
    .query("marketplaceClaims")
    .withIndex("by_inventoryId", (q) => q.eq("inventoryId", item._id))
    .first();

  const imageUrls = await Promise.all(
    (item.images ?? []).map(async (id) => await ctx.storage.getUrl(id)),
  );

  return {
    id: item._id,
    name: item.name,
    category: item.category as "sell" | "donate",
    quantity: item.quantity,
    price: item.category === "sell" ? item.estimatedValue : undefined,
    imageUrls: imageUrls.filter((url): url is string => url !== null),
    claimedBy: claim?.name,
  };
};

/** Public storefront data. Never return private move-planning fields here. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    const visible = inventory.filter(
      (item) =>
        (item.category === "sell" || item.category === "donate") &&
        item.status !== "complete",
    );
    const items = await Promise.all(visible.map(async (item) => await publicItem(ctx, item)));

    return items.sort((a, b) => {
      // Keep the useful, listing-ready items at the top and claimed items at
      // the bottom. Alphabetical order makes every group predictable.
      const byClaim = Number(Boolean(a.claimedBy)) - Number(Boolean(b.claimedBy));
      if (byClaim !== 0) return byClaim;

      const byPhoto = Number(b.imageUrls.length > 0) - Number(a.imageUrls.length > 0);
      if (byPhoto !== 0) return byPhoto;

      const aNeedsPrice = a.category === "sell" && a.price === undefined;
      const bNeedsPrice = b.category === "sell" && b.price === undefined;
      const byListingReadiness = Number(aNeedsPrice) - Number(bNeedsPrice);
      if (byListingReadiness !== 0) return byListingReadiness;

      return a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" });
    });
  },
});

export const get = query({
  args: { id: v.id("inventory") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (
      !item ||
      (item.category !== "sell" && item.category !== "donate") ||
      item.status === "complete"
    ) return null;
    return await publicItem(ctx, item);
  },
});

/** Internal move-planner view of every sell/donate item and its claimant. */
export const claimsDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);

    const inventory = await ctx.db.query("inventory").collect();
    const claims = await ctx.db.query("marketplaceClaims").collect();
    const claimsByInventoryId = new Map(
      claims.map((claim) => [claim.inventoryId, claim]),
    );

    return inventory
      .filter((item) => item.category === "sell" || item.category === "donate")
      .map((item) => {
        const claim = claimsByInventoryId.get(item._id);
        return {
          id: item._id,
          name: item.name,
          category: item.category as "sell" | "donate",
          room: item.room,
          quantity: item.quantity,
          status: item.status,
          estimatedValue: item.estimatedValue,
          soldPrice: item.soldPrice,
          claimedBy: claim?.name,
          claimedAt: claim?.createdAt,
        };
      });
  },
});

export const claim = mutation({
  args: { inventoryId: v.id("inventory"), name: v.string() },
  handler: async (ctx, { inventoryId, name: rawName }) => {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 80) {
      throw new Error("Please enter your name (2–80 characters)");
    }

    const item = await ctx.db.get(inventoryId);
    if (
      !item ||
      (item.category !== "sell" && item.category !== "donate") ||
      item.status === "complete"
    ) throw new Error("This item is no longer available");

    const existing = await ctx.db
      .query("marketplaceClaims")
      .withIndex("by_inventoryId", (q) => q.eq("inventoryId", inventoryId))
      .first();
    if (existing) throw new Error(`This has already been claimed by ${existing.name}`);

    await ctx.db.insert("marketplaceClaims", { inventoryId, name, createdAt: Date.now() });
    return null;
  },
});
