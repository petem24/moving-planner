import { useState, type FormEvent } from "react";
import { Gift, House, LoaderCircle, PackagePlus, Ship, Tag, Trash2, X, type LucideIcon } from "lucide-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Category, NewInventoryItem } from "./inventory-types";

type ItemFormProps = {
  defaultCategory: Category;
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (item: NewInventoryItem) => Promise<void>;
};

const categories: Array<{ value: Category; label: string; hint: string; icon: LucideIcon; active: string }> = [
  { value: "sell", label: "Sell", hint: "List it for sale", icon: Tag, active: "border-sell bg-sell-subtle text-sell-strong" },
  { value: "ship", label: "Ship", hint: "Send to Portland", icon: Ship, active: "border-ship bg-ship-subtle text-ship-strong" },
  { value: "donate", label: "Donate", hint: "Give it away", icon: Gift, active: "border-donate bg-donate-subtle text-donate-strong" },
  { value: "trash", label: "Trash", hint: "Recycle or dispose", icon: Trash2, active: "border-bin bg-bin-subtle text-bin-strong" },
  { value: "store", label: "Store", hint: "Keep it in the UK", icon: House, active: "border-keep bg-keep-subtle text-keep-strong" },
];

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

const fieldLabel = "mb-1.5 block text-xs font-medium text-foreground";

export function ItemForm({ defaultCategory, error, isSaving, onCancel, onSave }: ItemFormProps) {
  const [category, setCategory] = useState(defaultCategory);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [owner, setOwner] = useState("");
  const [destination, setDestination] = useState("");
  const [donationLocation, setDonationLocation] = useState("");
  const [marketplaceLink, setMarketplaceLink] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");

  const optional = (value: string) => value.trim() || undefined;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const item: NewInventoryItem = {
      name: name.trim(),
      category,
      room: room.trim(),
      quantity: Number(quantity),
      notes: optional(notes),
    };

    if (category === "sell") {
      item.owner = optional(owner);
      item.marketplaceLink = optional(marketplaceLink);
      item.estimatedValue = estimatedValue === "" ? undefined : Number(estimatedValue);
    } else if (category === "donate") {
      item.donationLocation = optional(donationLocation);
    } else {
      item.destination = optional(destination);
      if (category === "ship" || category === "store") item.owner = optional(owner);
    }

    await onSave(item);
  };

  const switchCategory = (nextCategory: Category) => {
    setCategory(nextCategory);
    setOwner("");
    setDestination("");
    setDonationLocation("");
    setMarketplaceLink("");
    setEstimatedValue("");
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="item-form-description"
          className="fixed inset-x-3 bottom-3 z-50 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:data-[state=open]:zoom-in-95"
          onEscapeKeyDown={(event) => isSaving && event.preventDefault()}
          onInteractOutside={(event) => isSaving && event.preventDefault()}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
            <div>
              <Dialog.Title className="font-display text-xl">Add an item</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-muted-foreground" id="item-form-description">
                Start with the basics, then add the details for where it’s going.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Close" disabled={isSaving} size="icon" type="button" variant="ghost">
                <X />
              </Button>
            </Dialog.Close>
          </header>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 px-5 py-5 sm:px-6">
              <fieldset>
                <legend className={fieldLabel}>What are you doing with it?</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {categories.map((option) => {
                    const Icon = option.icon;
                    const active = category === option.value;
                    return (
                      <button
                        aria-pressed={active}
                        className={cn(
                          "flex min-h-18 flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                          active ? option.active : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                        key={option.value}
                        onClick={() => switchCategory(option.value)}
                        type="button"
                      >
                        <Icon className="size-4" />
                        <span>
                          <span className="block text-sm font-medium">{option.label}</span>
                          <span className="hidden text-[10px] opacity-75 sm:block">{option.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="eyebrow mb-3">Item details</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={fieldLabel} htmlFor="item-name">Item name</label>
                    <input autoFocus className={inputClass} id="item-name" maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="e.g. Coffee machine" required value={name} />
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="item-room">Room</label>
                    <input className={inputClass} id="item-room" list="room-suggestions" maxLength={80} onChange={(event) => setRoom(event.target.value)} placeholder="e.g. Kitchen" required value={room} />
                    <datalist id="room-suggestions">
                      {["Living Room", "Kitchen", "Office", "Bathroom", "Hall Closet", "Hallway", "Bedroom"].map((suggestion) => <option key={suggestion} value={suggestion} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="item-quantity">Quantity</label>
                    <input className={inputClass} id="item-quantity" inputMode="numeric" min="1" onChange={(event) => setQuantity(event.target.value)} required step="1" type="number" value={quantity} />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="eyebrow mb-3">{categories.find((option) => option.value === category)?.label} details</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  {category === "sell" && (
                    <>
                      <OptionalField id="item-owner" label="Owner" onChange={setOwner} placeholder="Peter, Erin, Beth…" value={owner} />
                      <div>
                        <label className={fieldLabel} htmlFor="item-value">Asking price <Optional /></label>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                          <input className={cn(inputClass, "pl-7")} id="item-value" inputMode="decimal" min="0" onChange={(event) => setEstimatedValue(event.target.value)} placeholder="0" step="0.01" type="number" value={estimatedValue} />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={fieldLabel} htmlFor="item-listing">Marketplace listing <Optional /></label>
                        <input className={inputClass} id="item-listing" onChange={(event) => setMarketplaceLink(event.target.value)} placeholder="https://…" type="url" value={marketplaceLink} />
                      </div>
                    </>
                  )}

                  {(category === "ship" || category === "store") && (
                    <OptionalField id="item-owner" label={category === "ship" ? "Travelling with" : "Owner"} onChange={setOwner} placeholder="Peter or Erin" value={owner} />
                  )}
                  {category === "ship" && <OptionalField id="item-destination" label="Shipment / box" onChange={setDestination} placeholder="October shipment, Box 04…" value={destination} />}
                  {category === "store" && <OptionalField id="item-destination" label="Stored at / with" onChange={setDestination} placeholder="Mum’s loft…" value={destination} />}
                  {category === "trash" && <OptionalField id="item-destination" label="Disposal route" onChange={setDestination} placeholder="Recycling, council tip…" value={destination} />}
                  {category === "donate" && <OptionalField id="item-donation" label="Going to" onChange={setDonationLocation} placeholder="Beth, charity shop…" value={donationLocation} />}
                </div>
              </fieldset>

              <div>
                <label className={fieldLabel} htmlFor="item-notes">Notes <Optional /></label>
                <textarea className={cn(inputClass, "min-h-20 resize-y")} id="item-notes" maxLength={2_000} onChange={(event) => setNotes(event.target.value)} placeholder="Anything useful to remember" value={notes} />
              </div>

              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </div>

            <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
              <div className="flex items-center gap-2">
                <Dialog.Close asChild>
                  <Button disabled={isSaving} type="button" variant="ghost">Cancel</Button>
                </Dialog.Close>
                <Button disabled={isSaving} type="submit">
                  {isSaving ? <LoaderCircle className="animate-spin" /> : <PackagePlus />}
                  {isSaving ? "Adding…" : "Add item"}
                </Button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OptionalField({ id, label, onChange, placeholder, value }: { id: string; label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <div>
      <label className={fieldLabel} htmlFor={id}>{label} <Optional /></label>
      <input className={inputClass} id={id} maxLength={200} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </div>
  );
}

function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>;
}
