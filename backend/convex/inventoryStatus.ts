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

export const legacyInventoryStatus = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("complete"),
);

export type InventoryCategory = "sell" | "ship" | "donate" | "trash" | "store";
export type InventoryStatus =
  | "for_sale" | "sold"
  | "available" | "claimed" | "donated"
  | "to_dispose" | "disposed"
  | "to_pack" | "packed" | "shipped"
  | "to_store" | "stored";
export type LegacyInventoryStatus = "pending" | "in_progress" | "complete";

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

export function normalizeInventoryStatus(
  category: InventoryCategory,
  status: InventoryStatus | LegacyInventoryStatus,
  hasClaim = false,
): InventoryStatus {
  if (status !== "pending" && status !== "in_progress" && status !== "complete") return status;

  if (category === "sell") return status === "complete" ? "sold" : "for_sale";
  if (category === "donate") {
    if (status === "complete") return "donated";
    return status === "in_progress" || hasClaim ? "claimed" : "available";
  }
  if (category === "trash") return status === "complete" ? "disposed" : "to_dispose";
  if (category === "ship") {
    if (status === "complete") return "shipped";
    return status === "in_progress" ? "packed" : "to_pack";
  }
  return status === "complete" ? "stored" : "to_store";
}
