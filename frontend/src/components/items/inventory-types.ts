import type { Id } from "../../../../backend/convex/_generated/dataModel";

export type Category = "sell" | "ship" | "donate" | "trash" | "store";

export type ItemStatus =
  | "for_sale" | "sold"
  | "available" | "claimed" | "donated"
  | "to_dispose" | "disposed"
  | "to_pack" | "packed" | "shipped"
  | "to_store" | "stored";

export type InventoryItem = {
  id: string;
  name: string;
  category: Category;
  room: string;
  quantity: number;
  status: ItemStatus;
  marketplaceLink?: string;
  donationLocation?: string;
  owner?: string;
  destination?: string;
  notes?: string;
  estimatedValue?: number;
  soldPrice?: number;
  images?: Array<Id<"_storage">>;
};

export type NewInventoryItem = Omit<InventoryItem, "id" | "status" | "soldPrice">;

export type InventoryItemUpdate = Omit<InventoryItem, "id">;
