import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Check, Download, Image, LoaderCircle, X } from "lucide-react";
import { Dialog } from "radix-ui";

import { api } from "../../../../backend/convex/_generated/api";
import type { Id } from "../../../../backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { createMarketplaceExport, downloadMarketplaceExport } from "@/lib/marketplace-export";

import type { InventoryItem } from "./inventory-types";

type Props = {
  items: InventoryItem[];
  onClose: () => void;
  preview?: boolean;
};

export function MarketplaceExportDialog({ items, onClose, preview = false }: Props) {
  if (preview) return <MarketplaceExportDialogContent imageUrls={{}} items={items} onClose={onClose} />;
  return <ConnectedMarketplaceExportDialog items={items} onClose={onClose} />;
}

function ConnectedMarketplaceExportDialog({ items, onClose }: Omit<Props, "preview">) {
  const imageIds = items.flatMap((item) => item.images ?? []) as Array<Id<"_storage">>;
  const imageUrls = useQuery(api.inventory.imageUrls, { ids: imageIds });
  return <MarketplaceExportDialogContent imageUrls={imageUrls} items={items} onClose={onClose} />;
}

function MarketplaceExportDialogContent({ imageUrls, items, onClose }: Omit<Props, "preview"> & { imageUrls: Record<string, string | null> | undefined }) {
  const defaultIds = useMemo(
    () => items.filter((item) => !item.marketplaceLink).map((item) => item.id),
    [items],
  );
  const [selectedIds, setSelectedIds] = useState(() => new Set(defaultIds));
  const [isExporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const allSelected = selectedIds.size === items.length;

  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  const toggleItem = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const exportItems = async () => {
    if (selectedItems.length === 0) return;
    setError(null);
    setExporting(true);
    try {
      const data = await createMarketplaceExport(selectedItems, imageUrls ?? {});
      downloadMarketplaceExport(data, selectedItems.length);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't create the export. Try again.");
      setExporting(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !isExporting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby="marketplace-export-description"
          className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl outline-none sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2"
          onEscapeKeyDown={(event) => isExporting && event.preventDefault()}
          onInteractOutside={(event) => isExporting && event.preventDefault()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <Dialog.Title className="font-display text-xl">Export for Facebook</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground" id="marketplace-export-description">
                Choose items for one ZIP containing their listing details and photos.
              </Dialog.Description>
            </div>
            <Button aria-label="Close" disabled={isExporting} onClick={onClose} size="icon" type="button" variant="ghost"><X /></Button>
          </header>

          <div className="max-h-[55vh] overflow-y-auto px-5 py-4 sm:px-6">
            <button className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted" onClick={toggleAll} type="button">
              <span>{allSelected ? "Deselect all" : "Select all"}</span>
              <span>{selectedItems.length} of {items.length} selected</span>
            </button>
            <div className="divide-y divide-border rounded-xl border border-border">
              {items.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-muted/40" key={item.id}>
                    <input checked={selected} className="sr-only" onChange={() => toggleItem(item.id)} type="checkbox" />
                    <span className={`grid size-5 shrink-0 place-items-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                      {selected && <Check className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.estimatedValue === undefined ? "No price" : `£${item.estimatedValue}`}</span>
                        <span className="inline-flex items-center gap-1"><Image className="size-3" />{item.images?.length ?? 0}</span>
                        {item.marketplaceLink && <span>Already has a listing</span>}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border bg-muted/25 px-5 py-4 sm:px-6">
            <p className="text-xs text-muted-foreground">Built privately in your browser.</p>
            <div className="flex gap-2">
              <Button disabled={isExporting} onClick={onClose} type="button" variant="ghost">Cancel</Button>
              <Button disabled={isExporting || selectedItems.length === 0 || imageUrls === undefined} onClick={() => void exportItems()} type="button">
                {isExporting ? <LoaderCircle className="animate-spin" /> : <Download />}
                {isExporting ? "Building ZIP…" : `Export ${selectedItems.length}`}
              </Button>
            </div>
          </footer>
          {error && <p className="border-t border-destructive/20 bg-destructive/10 px-5 py-2 text-sm text-destructive" role="alert">{error}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
