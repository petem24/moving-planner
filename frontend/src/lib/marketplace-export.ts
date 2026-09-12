import { strToU8, zip } from "fflate";

import type { InventoryItem } from "../components/items/inventory-types";

type ImageUrlMap = Record<string, string | null>;

const utf8 = (value: string) => strToU8(value.replace(/\r?\n/g, "\r\n"));

function safeName(value: string) {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return (cleaned || "item").slice(0, 80);
}

function csvCell(value: string | number | undefined) {
  const cell = value === undefined ? "" : String(value);
  return `"${cell.replace(/"/g, '""')}"`;
}

function photoExtension(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("avif")) return "avif";
  return "jpg";
}

function listingDescription(item: InventoryItem) {
  const lines = [item.notes?.trim()];
  if (item.quantity > 1) lines.push(`Quantity: ${item.quantity}`);
  return lines.filter(Boolean).join("\n\n");
}

function listingText(item: InventoryItem) {
  const description = listingDescription(item);
  return [
    `TITLE\n${item.name}`,
    `PRICE\n${item.estimatedValue === undefined ? "Not set" : `£${item.estimatedValue}`}`,
    `DESCRIPTION\n${description || "No description added yet."}`,
  ].join("\n\n");
}

function zipFiles(files: Record<string, Uint8Array>) {
  return new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (error, data) => error ? reject(error) : resolve(data));
  });
}

/** Build a self-contained upload pack without sending inventory data anywhere else. */
export async function createMarketplaceExport(items: InventoryItem[], imageUrls: ImageUrlMap) {
  const files: Record<string, Uint8Array> = {};
  const csvRows = [["title", "price_gbp", "description", "photo_folder", "photo_count"]];

  for (const [itemIndex, item] of items.entries()) {
    const folder = `${String(itemIndex + 1).padStart(2, "0")}-${safeName(item.name)}`;
    const images = item.images ?? [];
    files[`${folder}/listing.txt`] = utf8(listingText(item));

    csvRows.push([
      item.name,
      item.estimatedValue?.toString() ?? "",
      listingDescription(item),
      folder,
      images.length.toString(),
    ]);

    for (const [imageIndex, storageId] of images.entries()) {
      const url = imageUrls[storageId];
      if (!url) throw new Error(`A photo for “${item.name}” is unavailable. Try the export again.`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Couldn't download a photo for “${item.name}”. Try again.`);
      const blob = await response.blob();
      const extension = photoExtension(blob.type || response.headers.get("content-type") || "");
      files[`${folder}/photo-${String(imageIndex + 1).padStart(2, "0")}.${extension}`] = new Uint8Array(await blob.arrayBuffer());
    }
  }

  files["listings.csv"] = utf8(csvRows.map((row) => row.map(csvCell).join(",")).join("\n"));
  files["README.txt"] = utf8([
    "Facebook Marketplace upload pack",
    "",
    "Each numbered folder contains one item's listing text and photos.",
    "",
    "For each item:",
    "1. Open listing.txt and copy the title, price and description.",
    "2. In Facebook Marketplace, create a new item listing.",
    "3. Select all photo files in the item's folder at once.",
    "4. Paste the listing details, choose category, condition and location, then review and publish.",
    "",
    "listings.csv contains the same details as a compact overview.",
  ].join("\n"));

  return await zipFiles(files);
}

export function downloadMarketplaceExport(data: Uint8Array, itemCount: number) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([data as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `facebook-marketplace-${date}-${itemCount}-items.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
