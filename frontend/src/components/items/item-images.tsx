import { useEffect, useRef, useState, type RefObject } from "react";
import { useMutation, useQuery } from "convex/react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";

import { api } from "../../../../backend/convex/_generated/api";
import type { Id } from "../../../../backend/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { resizeImage } from "@/lib/image";

const MAX_IMAGES = 6;

export function ItemImages({ itemId, itemName, images }: { itemId: Id<"inventory">; itemName: string; images: Array<Id<"_storage">> }) {
  const generateUploadUrl = useMutation(api.inventory.generateUploadUrl);
  const addImage = useMutation(api.inventory.addImage);
  const discardImage = useMutation(api.inventory.discardImage);
  const removeImage = useMutation(api.inventory.removeImage);
  const urlMap = useQuery(api.inventory.imageUrls, { ids: images });

  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setUploading] = useState(false);
  const [removingStorageId, setRemovingStorageId] = useState<Id<"_storage"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const atLimit = images.length >= MAX_IMAGES;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    let unattachedId: Id<"_storage"> | null = null;
    let remainingSlots = MAX_IMAGES - images.length;
    try {
      for (const file of Array.from(fileList)) {
        if (!file.type.startsWith("image/") || remainingSlots <= 0) continue;

        const blob = await resizeImage(file);
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        if (!response.ok) throw new Error("Upload failed — try again");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        unattachedId = storageId;
        await addImage({ id: itemId, storageId });
        unattachedId = null;
        remainingSlots -= 1;
      }
    } catch (caught) {
      if (unattachedId) await discardImage({ storageId: unattachedId }).catch(() => undefined);
      setError(caught instanceof Error ? caught.message : "Couldn't upload that photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (storageId: Id<"_storage">) => {
    setError(null);
    setRemovingStorageId(storageId);
    try {
      await removeImage({ id: itemId, storageId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't remove that photo");
    } finally {
      setRemovingStorageId(null);
    }
  };

  return (
    <fieldset>
      <legend className="eyebrow mb-3">Photos</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {images.map((storageId) => (
          <figure className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted" key={storageId}>
            {urlMap === undefined ? (
              <div aria-label="Loading photo" className="h-full w-full animate-pulse bg-muted" role="status" />
            ) : (
              <a href={urlMap[storageId] ?? undefined} rel="noreferrer" target="_blank">
                <img alt={`Photo of ${itemName}`} className={cn("h-full w-full object-cover", !urlMap[storageId] && "hidden")} loading="lazy" src={urlMap[storageId] ?? undefined} />
              </a>
            )}
            {!urlMap?.[storageId] && urlMap !== undefined && (
              <figcaption className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Missing</figcaption>
            )}
            <button aria-label="Remove photo" className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={isUploading || removingStorageId !== null} onClick={() => void handleRemove(storageId)} type="button">
              <X className="size-3.5" />
            </button>
          </figure>
        ))}

        {!atLimit && (
          <button aria-label="Add photos" className={cn("grid aspect-square place-items-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 hover:border-ring hover:bg-muted/50 hover:text-foreground", (isUploading || removingStorageId !== null) && "pointer-events-none opacity-60")} disabled={isUploading || removingStorageId !== null} onClick={() => inputRef.current?.click()} type="button">
            {isUploading ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="px-1 text-center text-[11px] leading-tight">{isUploading ? "Uploading…" : "Add photos"}</span>
          </button>
        )}
      </div>

      <input accept="image/*" className="sr-only" multiple onChange={(event) => void handleFiles(event.target.files)} ref={inputRef} tabIndex={-1} type="file" />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {atLimit ? `${MAX_IMAGES} of ${MAX_IMAGES} photos — remove one to add another` : `${images.length} of ${MAX_IMAGES} photos · compressed automatically before upload`}
      </p>
      {error && <p className="mt-1 text-sm text-destructive" role="alert">{error}</p>}
    </fieldset>
  );
}

/**
 * Photo picker for an item that does not exist yet: files are uploaded to
 * storage straight away and the resulting ids are attached when the item is
 * created. Unused uploads are discarded if the form is cancelled.
 */
export function NewItemPhotos({ storageIds, onChange, committedRef }: { storageIds: Array<Id<"_storage">>; onChange: (ids: Array<Id<"_storage">>) => void; committedRef: RefObject<boolean> }) {
  const generateUploadUrl = useMutation(api.inventory.generateUploadUrl);
  const discardImage = useMutation(api.inventory.discardImage);
  const urlMap = useQuery(api.inventory.imageUrls, { ids: storageIds });

  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = storageIds.length >= MAX_IMAGES;

  // Abandoning the form leaves the uploads orphaned, so clean them up.
  const pendingRef = useRef(storageIds);
  pendingRef.current = storageIds;
  useEffect(() => () => {
    if (committedRef.current) return;
    for (const storageId of pendingRef.current) void discardImage({ storageId }).catch(() => undefined);
  }, [committedRef, discardImage]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    const uploaded: Array<Id<"_storage">> = [];
    let remainingSlots = MAX_IMAGES - storageIds.length;
    try {
      for (const file of Array.from(fileList)) {
        if (!file.type.startsWith("image/") || remainingSlots <= 0) continue;

        const blob = await resizeImage(file);
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        if (!response.ok) throw new Error("Upload failed — try again");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        uploaded.push(storageId);
        remainingSlots -= 1;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't upload that photo");
    } finally {
      if (uploaded.length > 0) onChange([...storageIds, ...uploaded]);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = (storageId: Id<"_storage">) => {
    onChange(storageIds.filter((id) => id !== storageId));
    void discardImage({ storageId }).catch(() => undefined);
  };

  return (
    <fieldset>
      <legend className="eyebrow mb-3">Photos <span className="font-normal text-muted-foreground normal-case">(optional)</span></legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {storageIds.map((storageId) => (
          <figure className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted" key={storageId}>
            {urlMap?.[storageId] ? (
              <img alt="" className="h-full w-full object-cover" src={urlMap[storageId] ?? undefined} />
            ) : (
              <div aria-label="Loading photo" className="h-full w-full animate-pulse bg-muted" role="status" />
            )}
            <button aria-label="Remove photo" className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={isUploading} onClick={() => handleRemove(storageId)} type="button">
              <X className="size-3.5" />
            </button>
          </figure>
        ))}

        {!atLimit && (
          <button aria-label="Add photos" className={cn("grid aspect-square place-items-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 hover:border-ring hover:bg-muted/50 hover:text-foreground", isUploading && "pointer-events-none opacity-60")} disabled={isUploading} onClick={() => inputRef.current?.click()} type="button">
            {isUploading ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="px-1 text-center text-[11px] leading-tight">{isUploading ? "Uploading…" : "Add photos"}</span>
          </button>
        )}
      </div>

      <input accept="image/*" className="sr-only" multiple onChange={(event) => void handleFiles(event.target.files)} ref={inputRef} tabIndex={-1} type="file" />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {atLimit ? `${MAX_IMAGES} of ${MAX_IMAGES} photos — remove one to add another` : `${storageIds.length} of ${MAX_IMAGES} photos · compressed automatically before upload`}
      </p>
      {error && <p className="mt-1 text-sm text-destructive" role="alert">{error}</p>}
    </fieldset>
  );
}
