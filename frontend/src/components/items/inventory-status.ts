import type { Category, InventoryItem, ItemStatus } from "./inventory-types";

export const statusesByCategory: Record<Category, ReadonlyArray<{ value: ItemStatus; label: string }>> = {
  sell: [
    { value: "for_sale", label: "For sale" },
    { value: "sold", label: "Sold" },
  ],
  donate: [
    { value: "available", label: "Available" },
    { value: "claimed", label: "Claimed" },
    { value: "donated", label: "Donated" },
  ],
  trash: [
    { value: "to_dispose", label: "To dispose" },
    { value: "disposed", label: "Disposed" },
  ],
  ship: [
    { value: "to_pack", label: "To pack" },
    { value: "packed", label: "Packed" },
    { value: "shipped", label: "Shipped" },
  ],
  store: [
    { value: "to_store", label: "To store" },
    { value: "stored", label: "Stored" },
  ],
};

export const statusLabels = Object.fromEntries(
  Object.values(statusesByCategory).flat().map(({ value, label }) => [value, label]),
) as Record<ItemStatus, string>;

export const finishedStatuses = new Set<ItemStatus>(["sold", "donated", "disposed", "shipped", "stored"]);

export function initialStatus(category: Category) {
  return statusesByCategory[category][0].value;
}

type LegacyStatus = "pending" | "in_progress" | "complete";

export function normalizePreviewItem(item: InventoryItem | (Omit<InventoryItem, "status"> & { status: LegacyStatus })): InventoryItem {
  if (item.status !== "pending" && item.status !== "in_progress" && item.status !== "complete") return item as InventoryItem;
  const status = item.category === "sell"
    ? (item.status === "complete" ? "sold" : "for_sale")
    : item.category === "donate"
      ? (item.status === "complete" ? "donated" : item.status === "in_progress" ? "claimed" : "available")
      : item.category === "trash"
        ? (item.status === "complete" ? "disposed" : "to_dispose")
        : item.category === "ship"
          ? (item.status === "complete" ? "shipped" : item.status === "in_progress" ? "packed" : "to_pack")
          : (item.status === "complete" ? "stored" : "to_store");
  return { ...item, status };
}
