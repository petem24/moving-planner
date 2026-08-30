import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Gift, ImageIcon, LoaderCircle, PackageOpen, Search, Tag } from "lucide-react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";

import { api } from "../../../../backend/convex/_generated/api";
import type { Id } from "../../../../backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type PublicItem = {
  id: string;
  name: string;
  category: "sell" | "donate";
  quantity: number;
  price?: number;
  imageUrls: string[];
  claimed: boolean;
  claimedBy?: string;
};

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const sampleItems: PublicItem[] = [
  { id: "s1", name: "Nintendo Switch", category: "sell", quantity: 1, price: 180, imageUrls: [], claimed: false },
  { id: "s2", name: "Coffee machine", category: "sell", quantity: 1, price: 75, imageUrls: [], claimed: false },
  { id: "s3", name: "Couch", category: "sell", quantity: 1, price: 220, imageUrls: [], claimed: false },
  { id: "d1", name: "Ivy plant", category: "donate", quantity: 1, imageUrls: [], claimed: false },
  { id: "d2", name: "Computer monitor / iPad", category: "donate", quantity: 1, imageUrls: [], claimed: false },
  { id: "d3", name: "Bath towels", category: "donate", quantity: 4, imageUrls: [], claimed: false },
];

function previewItems(): PublicItem[] {
  const claims = JSON.parse(sessionStorage.getItem("preview-marketplace-claims") ?? "{}") as Record<string, string>;
  return sampleItems.map((item) => ({ ...item, claimed: Boolean(claims[item.id]), claimedBy: claims[item.id] }));
}

export function PublicMarketplace({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Please Buy";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => {
      document.title = previousTitle;
      media.removeEventListener("change", apply);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-2.5" to="/marketplace">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><PackageOpen className="size-4.5" /></span>
            <span className="font-display text-lg leading-none">Please Buy</span>
          </Link>
        </div>
      </header>
      <Routes>
        <Route path="/marketplace" element={enabled ? <ConnectedListing /> : <PreviewListing />} />
        <Route path="/marketplace/:itemId" element={enabled ? <ConnectedDetail /> : <PreviewDetail />} />
        <Route path="*" element={<Navigate replace to="/marketplace" />} />
      </Routes>
    </div>
  );
}

function ConnectedListing() {
  const items = useQuery(api.marketplace.list);
  if (items === undefined) return <Loading />;
  return <Listing items={items} />;
}

function PreviewListing() {
  return <Listing items={previewItems()} />;
}

function Listing({ items }: { items: PublicItem[] }) {
  const [filter, setFilter] = useState<"all" | "sell" | "donate">("all");
  const [search, setSearch] = useState("");
  const shown = useMemo(() => items.filter((item) => {
    const matchesFilter = filter === "all" || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  }), [filter, items, search]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="sr-only">Items for sale or free</h1>
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex gap-2" role="group" aria-label="Filter items">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All <span className="opacity-60">{items.length}</span></FilterButton>
          <FilterButton active={filter === "sell"} onClick={() => setFilter("sell")}><Tag className="size-3.5" /> For sale</FilterButton>
          <FilterButton active={filter === "donate"} onClick={() => setFilter("donate")}><Gift className="size-3.5" /> Free</FilterButton>
        </div>
        <label className="relative block sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search items</span>
          <input className="h-10 w-full rounded-xl border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" onChange={(event) => setSearch(event.target.value)} placeholder="Search items" value={search} />
        </label>
      </div>

      {shown.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {shown.map((item) => <MarketplaceCard item={item} key={item.id} />)}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center text-center"><div><PackageOpen className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 font-medium">Nothing here right now</p><p className="mt-1 text-sm text-muted-foreground">Try another filter or search.</p></div></div>
      )}
    </main>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button aria-pressed={active} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`} onClick={onClick} type="button">{children}</button>;
}

function MarketplaceCard({ item }: { item: PublicItem }) {
  return (
    <Link className="group block min-w-0" to={`/marketplace/${item.id}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:rounded-2xl">
        {item.imageUrls[0] ? <img alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" src={item.imageUrls[0]} /> : <div className={`grid h-full place-items-center ${item.category === "sell" ? "bg-sell-subtle text-sell-strong" : "bg-donate-subtle text-donate-strong"}`}><ImageIcon className="size-7 opacity-50" /></div>}
        <span className={`absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur ${item.category === "sell" ? "bg-card/90 text-sell-strong" : "bg-primary text-primary-foreground"}`}>{item.category === "sell" ? (item.price === undefined ? "Price TBC" : money.format(item.price)) : "Free"}</span>
        {item.imageUrls.length > 1 && <span className="absolute right-2 bottom-2 rounded-full bg-foreground/70 px-2 py-1 text-[10px] font-medium text-background">1 / {item.imageUrls.length}</span>}
      </div>
      <h2 className="mt-2.5 truncate font-medium group-hover:text-primary">{item.name}</h2>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{item.quantity > 1 ? `${item.quantity} available` : item.category === "sell" ? "For sale" : "Free"}</span>
        {item.claimed && <span className="shrink-0 font-medium text-foreground">Claimed</span>}
      </div>
    </Link>
  );
}

function ConnectedDetail() {
  const { itemId = "" } = useParams();
  const item = useQuery(api.marketplace.get, { id: itemId as Id<"inventory"> });
  const claim = useMutation(api.marketplace.claim);
  if (item === undefined) return <Loading />;
  if (item === null) return <Missing />;
  return <Detail item={item} onClaim={async (name) => { await claim({ inventoryId: item.id, name }); }} />;
}

function PreviewDetail() {
  const { itemId = "" } = useParams();
  const [items, setItems] = useState(previewItems);
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) return <Missing />;
  return <Detail item={item} onClaim={async (name) => {
    const claims = JSON.parse(sessionStorage.getItem("preview-marketplace-claims") ?? "{}") as Record<string, string>;
    claims[item.id] = name.trim();
    sessionStorage.setItem("preview-marketplace-claims", JSON.stringify(claims));
    setItems(previewItems());
  }} />;
}

function Detail({ item, onClaim }: { item: PublicItem; onClaim: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try { await onClaim(name); }
    catch (caught) { setError(caught instanceof Error ? caught.message.replace(/^.*Uncaught Error: /, "") : "Couldn’t claim this item"); }
    finally { setSaving(false); }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" to="/marketplace"><ArrowLeft className="size-4" /> Back to everything</Link>
      <div className="grid gap-7 lg:grid-cols-[1.35fr_0.65fr] lg:gap-10">
        <section>
          <div className="overflow-hidden rounded-2xl bg-muted">
            {item.imageUrls[0] ? <img alt={`Photo of ${item.name}`} className="aspect-[4/3] w-full object-cover" src={item.imageUrls[0]} /> : <div className={`grid aspect-[4/3] place-items-center ${item.category === "sell" ? "bg-sell-subtle text-sell-strong" : "bg-donate-subtle text-donate-strong"}`}><ImageIcon className="size-12 opacity-40" /></div>}
          </div>
          {item.imageUrls.length > 1 && <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">{item.imageUrls.slice(1).map((url, index) => <a href={url} key={url} rel="noreferrer" target="_blank"><img alt={`${item.name}, photo ${index + 2}`} className="aspect-square w-full rounded-xl object-cover" src={url} /></a>)}</div>}
        </section>

        <aside className="lg:pt-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.category === "sell" ? "bg-sell-subtle text-sell-strong" : "bg-donate-subtle text-donate-strong"}`}>{item.category === "sell" ? <Tag className="size-3.5" /> : <Gift className="size-3.5" />}{item.category === "sell" ? "For sale" : "Free to a good home"}</span>
          <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{item.name}</h1>
          <p className="mt-2 font-display text-2xl text-primary">{item.category === "donate" ? "Free" : item.price === undefined ? "Price TBC" : money.format(item.price)}</p>
          {item.quantity > 1 && <p className="mt-4 text-sm text-muted-foreground">{item.quantity} available</p>}

          <div className="mt-7 border-t border-border pt-6">
            {item.claimed ? (
              <div className="rounded-2xl bg-primary/8 p-5"><Check className="size-6 text-primary" /><h2 className="mt-3 font-display text-xl">This one’s spoken for</h2><p className="mt-1 text-sm text-muted-foreground">{item.claimedBy ? `Claimed by ${item.claimedBy}.` : "Someone has already claimed it."}</p></div>
            ) : (
              <form className="rounded-2xl border border-border bg-card p-5 shadow-sm" onSubmit={submit}>
                <h2 className="font-display text-xl">Want this?</h2>
                <label className="mt-5 block text-xs font-medium" htmlFor="claim-name">Your name</label>
                <input autoComplete="name" className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20" id="claim-name" maxLength={80} minLength={2} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sarah Jones" required value={name} />
                {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
                <Button className="mt-4 w-full" disabled={saving} size="lg" type="submit">{saving ? <LoaderCircle className="animate-spin" /> : <Check />}{saving ? "Putting your name down…" : "I’d like this"}</Button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Loading() { return <main className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></main>; }
function Missing() { return <main className="grid min-h-[60vh] place-items-center px-6 text-center"><div><PackageOpen className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-3 font-display text-2xl">This item isn’t available</h1><p className="mt-2 text-sm text-muted-foreground">It may already have found a new home.</p><Button asChild className="mt-5"><Link to="/marketplace">See what’s available</Link></Button></div></main>; }
