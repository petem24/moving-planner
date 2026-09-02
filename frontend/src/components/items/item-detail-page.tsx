import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Gift, House, LoaderCircle, Save, Ship, Tag, Trash2, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Id } from "../../../../backend/convex/_generated/dataModel";

import { api } from "../../../../backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ItemImages } from "./item-images";
import { loadPreviewItems, savePreviewItem } from "./items-page";
import type { Category, InventoryItem, InventoryItemUpdate, ItemStatus } from "./inventory-types";
import { initialStatus, statusesByCategory } from "./inventory-status";

const categories: Array<{ value: Category; label: string; icon: LucideIcon; active: string }> = [
  { value: "sell", label: "Sell", icon: Tag, active: "border-sell bg-sell-subtle text-sell-strong" },
  { value: "ship", label: "Ship", icon: Ship, active: "border-ship bg-ship-subtle text-ship-strong" },
  { value: "donate", label: "Donate", icon: Gift, active: "border-donate bg-donate-subtle text-donate-strong" },
  { value: "trash", label: "Trash", icon: Trash2, active: "border-bin bg-bin-subtle text-bin-strong" },
  { value: "store", label: "Store", icon: House, active: "border-keep bg-keep-subtle text-keep-strong" },
];

const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
const fieldLabel = "mb-1.5 block text-xs font-medium text-foreground";

export function ItemDetailPage({ enabled }: { enabled: boolean }) {
  return enabled ? <ConnectedItemDetail /> : <PreviewItemDetail />;
}

function ConnectedItemDetail() {
  const { itemId = "" } = useParams();
  const item = useQuery(api.inventory.get, { id: itemId as Id<"inventory"> });
  const updateItem = useMutation(api.inventory.update);

  if (item === undefined) return <DetailLoading />;
  if (item === null) return <MissingItem />;

  return (
    <ItemEditor
      item={{
        id: item._id,
        name: item.name,
        category: item.category,
        room: item.room,
        quantity: item.quantity,
        status: item.status,
        marketplaceLink: item.marketplaceLink,
        donationLocation: item.donationLocation,
        owner: item.owner,
        destination: item.destination,
        notes: item.notes,
        estimatedValue: item.estimatedValue,
        soldPrice: item.soldPrice,
        images: item.images ?? [],
      }}
      onSave={async (updated) => updateItem({ id: item._id, ...updated })}
    />
  );
}

function PreviewItemDetail() {
  const { itemId = "" } = useParams();
  const item = loadPreviewItems().find((candidate) => candidate.id === itemId);
  if (!item) return <MissingItem />;
  return <ItemEditor item={item} onSave={async (updated) => savePreviewItem({ id: item.id, ...updated })} preview />;
}

function ItemEditor({ item, onSave, preview = false }: { item: InventoryItem; onSave: (item: InventoryItemUpdate) => Promise<unknown>; preview?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const storedReturn = sessionStorage.getItem(`inventory-return:${item.id}`);
  const stateReturn = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnTo = [stateReturn, storedReturn].find((value) => value?.startsWith("/items/")) ?? `/items/${item.category}`;

  const [category, setCategory] = useState(item.category);
  const [status, setStatus] = useState(item.status);
  const [name, setName] = useState(item.name);
  const [room, setRoom] = useState(item.room ?? "");
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [owner, setOwner] = useState(item.owner ?? "");
  const [destination, setDestination] = useState(item.destination ?? "");
  const [donationLocation, setDonationLocation] = useState(item.donationLocation ?? "");
  const [marketplaceLink, setMarketplaceLink] = useState(item.marketplaceLink ?? "");
  const [estimatedValue, setEstimatedValue] = useState(item.estimatedValue?.toString() ?? "");
  const [soldPrice, setSoldPrice] = useState(item.soldPrice?.toString() ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statuses = statusesByCategory[category];

  const optional = (value: string) => value.trim() || undefined;
  const optionalNumber = (value: string) => value === "" ? undefined : Number(value);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        room: optional(room),
        quantity: Number(quantity),
        status,
        notes: optional(notes),
        owner: category === "sell" || category === "ship" || category === "store" ? optional(owner) : undefined,
        destination: category === "ship" || category === "trash" || category === "store" ? optional(destination) : undefined,
        donationLocation: category === "donate" ? optional(donationLocation) : undefined,
        marketplaceLink: category === "sell" ? optional(marketplaceLink) : undefined,
        estimatedValue: category === "sell" ? optionalNumber(estimatedValue) : undefined,
        soldPrice: category === "sell" ? optionalNumber(soldPrice) : undefined,
      });
      navigate(returnTo, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save this item");
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <button className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => navigate(returnTo, { replace: true })} type="button">
        <ArrowLeft className="size-4" /> Back to items
      </button>

      <form className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" onSubmit={handleSubmit}>
        <header className="border-b border-border px-5 py-5 sm:px-7 sm:py-6">
          <p className="eyebrow">Item details</p>
          <h1 className="mt-1 font-display text-display-xs">{name || "Untitled item"}</h1>
          {preview && <p className="mt-2 text-xs text-muted-foreground">Sample mode — changes last for this browser session.</p>}
        </header>

        <div className="space-y-7 px-5 py-6 sm:px-7">
          {!preview && (
            <ItemImages images={item.images ?? []} itemId={item.id as Id<"inventory">} itemName={item.name} />
          )}

          <fieldset>
            <legend className="eyebrow mb-3">Status</legend>
            <div className={`grid gap-2 ${statuses.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {statuses.map((option) => (
                <button
                  aria-pressed={status === option.value}
                  className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-medium transition-colors", status === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted")}
                  key={option.value}
                  onClick={() => setStatus(option.value)}
                  type="button"
                >
                  {status === option.value && <Check className="size-4" />}{option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-3">What are you doing with it?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {categories.map((option) => {
                const Icon = option.icon;
                return (
                  <button aria-pressed={category === option.value} className={cn("flex min-h-16 flex-col items-start justify-between rounded-xl border p-3 text-sm font-medium transition-colors", category === option.value ? option.active : "border-border bg-background text-muted-foreground hover:bg-muted")} key={option.value} onClick={() => { setCategory(option.value); setStatus(initialStatus(option.value)); }} type="button">
                    <Icon className="size-4" />{option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-3">Item</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" id="detail-name" label="Item name"><input className={inputClass} id="detail-name" maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} /></Field>
              <Field id="detail-room" label="Room"><input className={inputClass} id="detail-room" maxLength={80} onChange={(event) => setRoom(event.target.value)} placeholder="Optional" value={room} /></Field>
              <Field id="detail-quantity" label="Quantity"><input className={inputClass} id="detail-quantity" min="1" onChange={(event) => setQuantity(event.target.value)} required step="1" type="number" value={quantity} /></Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-3">{categories.find((option) => option.value === category)?.label} details</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {(category === "sell" || category === "ship" || category === "store") && <TextField id="detail-owner" label={category === "ship" ? "Travelling with" : "Owner"} onChange={setOwner} value={owner} />}
              {(category === "ship" || category === "trash" || category === "store") && <TextField id="detail-destination" label={category === "ship" ? "Shipment / box" : category === "trash" ? "Disposal route" : "Stored at / with"} onChange={setDestination} value={destination} />}
              {category === "donate" && <TextField id="detail-donation" label="Going to" onChange={setDonationLocation} value={donationLocation} />}
              {category === "sell" && (
                <>
                  <MoneyField id="detail-asking" label="Asking price" onChange={setEstimatedValue} value={estimatedValue} />
                  <MoneyField id="detail-sold" label="Sold for" onChange={setSoldPrice} value={soldPrice} />
                  <Field className="sm:col-span-2" id="detail-listing" label="Marketplace listing"><input className={inputClass} id="detail-listing" onChange={(event) => setMarketplaceLink(event.target.value)} placeholder="https://…" type="url" value={marketplaceLink} /></Field>
                </>
              )}
            </div>
          </fieldset>

          <Field id="detail-notes" label="Notes"><textarea className={cn(inputClass, "min-h-28 resize-y")} id="detail-notes" maxLength={2_000} onChange={(event) => setNotes(event.target.value)} value={notes} /></Field>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7">
          <Button disabled={isSaving} onClick={() => navigate(returnTo, { replace: true })} type="button" variant="ghost">Cancel</Button>
          <Button disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}{isSaving ? "Saving…" : "Save changes"}</Button>
        </footer>
      </form>
    </main>
  );
}

function Field({ children, className, id, label }: { children: React.ReactNode; className?: string; id: string; label: string }) {
  return <div className={className}><label className={fieldLabel} htmlFor={id}>{label}</label>{children}</div>;
}

function TextField({ id, label, onChange, value }: { id: string; label: string; onChange: (value: string) => void; value: string }) {
  return <Field id={id} label={label}><input className={inputClass} id={id} maxLength={200} onChange={(event) => onChange(event.target.value)} value={value} /></Field>;
}

function MoneyField({ id, label, onChange, value }: { id: string; label: string; onChange: (value: string) => void; value: string }) {
  return <Field id={id} label={label}><div className="relative"><span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">£</span><input className={cn(inputClass, "pl-7")} id={id} min="0" onChange={(event) => onChange(event.target.value)} step="0.01" type="number" value={value} /></div></Field>;
}

function DetailLoading() {
  return <main className="grid min-h-80 place-items-center"><p className="text-sm text-muted-foreground">Loading item…</p></main>;
}

function MissingItem() {
  const navigate = useNavigate();
  return <main className="mx-auto grid min-h-80 max-w-lg place-items-center px-6 text-center"><div><h1 className="font-display text-2xl">Item not found</h1><p className="mt-2 text-sm text-muted-foreground">It may have been removed or the link may be out of date.</p><Button className="mt-5" onClick={() => navigate("/items/all")}><ArrowLeft />Back to items</Button></div></main>;
}
