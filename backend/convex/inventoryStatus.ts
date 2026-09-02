import { v } from "convex/values";

export const inventoryStatus = v.union(
  v.literal("for_sale"),
  v.literal("sold"),
  v.literal("available"),
  v.literal("claimed"),
  v.literal("donated"),
  v.literal("to_dispose"),
  v.literal("disposed"),
  v.literal("to_pack"),
  v.literal("packed"),
  v.literal("shipped"),
  v.literal("to_store"),
  v.literal("stored"),
);

export type InventoryCategory = "sell" | "ship" | "donate" | "trash" | "store";
export type InventoryStatus =
  | "for_sale" | "sold"
  | "available" | "claimed" | "donated"
  | "to_dispose" | "disposed"
  | "to_pack" | "packed" | "shipped"
  | "to_store" | "stored";
const statusesByCategory: Record<InventoryCategory, readonly InventoryStatus[]> = {
  sell: ["for_sale", "sold"],
  donate: ["available", "claimed", "donated"],
  trash: ["to_dispose", "disposed"],
  ship: ["to_pack", "packed", "shipped"],
  store: ["to_store", "stored"],
};

export function initialStatus(category: InventoryCategory): InventoryStatus {
  return statusesByCategory[category][0];
}

export function isStatusForCategory(category: InventoryCategory, status: InventoryStatus) {
  return statusesByCategory[category].includes(status);
}

export function isFinishedStatus(status: InventoryStatus) {
  return ["sold", "donated", "disposed", "shipped", "stored"].includes(status);
}
