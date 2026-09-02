import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { ArrowLeft, Check, Gift, ImageIcon, LoaderCircle, Maximize2, PackageOpen, Search, Tag } from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

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
const marketplaceScrollKey = "please-buy-marketplace-scroll-y";

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
  const location = useLocation();

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

  useEffect(() => {
    if (location.pathname !== "/marketplace") return;

    const params = new URLSearchParams(location.search);
    const savedScroll = params.get("returnScroll") ?? sessionStorage.getItem(marketplaceScrollKey);
    if (savedScroll === null) return;

    const scrollY = Number(savedScroll);
    const clearSavedScroll = () => {
      sessionStorage.removeItem(marketplaceScrollKey);
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete("returnScroll");
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${nextParams.toString() ? `?${nextParams}` : ""}${window.location.hash}`);
    };

    if (!Number.isFinite(scrollY)) {
      clearSavedScroll();
      return;
    }

    let frame: number | undefined;
    let attempts = 0;
    const restore = () => {
      window.scrollTo(0, scrollY);
      attempts += 1;
      if (attempts < 30) {
        frame = requestAnimationFrame(restore);
        return;
      }
      clearSavedScroll();
    };

    frame = requestAnimationFrame(restore);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [location.pathname, location.search]);

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

type ListingFilter = "all" | "sell" | "donate" | "claimed";

function isListingFilter(value: string | null): value is ListingFilter {
  return value === "all" || value === "sell" || value === "donate" || value === "claimed";
}

function Listing({ items }: { items: PublicItem[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const filter: ListingFilter = isListingFilter(tabParam) ? tabParam : "all";
  const search = searchParams.get("search") ?? "";
  const claimantSearch = searchParams.get("claimant") ?? "";

  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("returnScroll");
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    setSearchParams(nextParams, { replace: true });
  };

  const listingSearchParams = new URLSearchParams(searchParams);
  listingSearchParams.delete("returnScroll");
  const marketplaceSearch = listingSearchParams.toString() ? `?${listingSearchParams}` : "";
  const counts = useMemo(() => {
    const available = items.filter((item) => !item.claimed);
    return {
      all: available.length,
      sell: available.filter((item) => item.category === "sell").length,
      donate: available.filter((item) => item.category === "donate").length,
      claimed: items.filter((item) => item.claimed).length,
    };
  }, [items]);
  const shown = useMemo(() => {
    const query = (filter === "claimed" ? claimantSearch : search).trim().toLowerCase();

    return items.filter((item) => {
      const matchesAvailability = filter === "claimed" ? item.claimed : !item.claimed;
      const matchesCategory = filter === "all" || filter === "claimed" || item.category === filter;
      const matchesSearch = filter === "claimed"
        ? (item.claimedBy ?? "").toLowerCase().includes(query)
        : item.name.toLowerCase().includes(query);
      return matchesAvailability && matchesCategory && matchesSearch;
    });
  }, [claimantSearch, filter, items, search]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="sr-only">Items for sale or free</h1>
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter items">
          <FilterButton active={filter === "all"} onClick={() => updateParam("tab", "")}>All <span className="opacity-60">{counts.all}</span></FilterButton>
          <FilterButton active={filter === "sell"} onClick={() => updateParam("tab", "sell")}><Tag className="size-3.5" /> For sale <span className="opacity-60">{counts.sell}</span></FilterButton>
          <FilterButton active={filter === "donate"} onClick={() => updateParam("tab", "donate")}><Gift className="size-3.5" /> Free <span className="opacity-60">{counts.donate}</span></FilterButton>
          <FilterButton active={filter === "claimed"} onClick={() => updateParam("tab", "claimed")}><Check className="size-3.5" /> Claimed <span className="opacity-60">{counts.claimed}</span></FilterButton>
        </div>
        <label className="relative block sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">{filter === "claimed" ? "Filter claimed items by person" : "Search items"}</span>
          <input
            className="h-10 w-full rounded-xl border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            onChange={(event) => updateParam(filter === "claimed" ? "claimant" : "search", event.target.value)}
            placeholder={filter === "claimed" ? "Filter by claimant name" : "Search items"}
            value={filter === "claimed" ? claimantSearch : search}
          />
        </label>
      </div>

      {shown.length ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {shown.map((item) => <MarketplaceCard item={item} key={item.id} marketplaceSearch={marketplaceSearch} />)}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center text-center"><div><PackageOpen className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 font-medium">{filter === "claimed" && !claimantSearch.trim() ? "Nothing has been claimed yet" : "Nothing here right now"}</p><p className="mt-1 text-sm text-muted-foreground">{filter === "claimed" ? "Try another claimant name." : "Try another filter or search."}</p></div></div>
      )}
    </main>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button aria-pressed={active} className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`} onClick={onClick} type="button">{children}</button>;
}

function MarketplaceCard({ item, marketplaceSearch }: { item: PublicItem; marketplaceSearch: string }) {
  const navigate = useNavigate();

  const openItem = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    sessionStorage.setItem(marketplaceScrollKey, String(window.scrollY));
    const itemSearch = new URLSearchParams(marketplaceSearch);
    itemSearch.set("returnScroll", String(window.scrollY));
    navigate(`/marketplace/${item.id}?${itemSearch.toString()}`);
  };

  return (
    <Link className="group block min-w-0" onClick={openItem} to={`/marketplace/${item.id}${marketplaceSearch}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted sm:rounded-2xl">
        {item.imageUrls[0] ? <img alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" src={item.imageUrls[0]} /> : <div className={`grid h-full place-items-center ${item.category === "sell" ? "bg-sell-subtle text-sell-strong" : "bg-donate-subtle text-donate-strong"}`}><ImageIcon className="size-7 opacity-50" /></div>}
        <span className={`absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur ${item.category === "sell" ? "bg-card/90 text-sell-strong" : "bg-primary text-primary-foreground"}`}>{item.category === "sell" ? (item.price === undefined ? "Price TBC" : money.format(item.price)) : "Free"}</span>
        {item.imageUrls.length > 1 && <span className="absolute right-2 bottom-2 rounded-full bg-foreground/70 px-2 py-1 text-[10px] font-medium text-background">1 / {item.imageUrls.length}</span>}
      </div>
      <h2 className="mt-2.5 truncate font-medium group-hover:text-primary">{item.name}</h2>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{item.quantity > 1 ? `${item.quantity} available` : item.category === "sell" ? "For sale" : "Free"}</span>
        {item.claimed && <span className="shrink-0 truncate font-medium text-foreground">{item.claimedBy ? `Claimed by ${item.claimedBy}` : "Claimed"}</span>}
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
  const location = useLocation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const slides = useMemo(() => item.imageUrls.map((src) => ({ src, alt: `Photo of ${item.name}` })), [item.imageUrls, item.name]);

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
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" to={{ pathname: "/marketplace", search: location.search }}><ArrowLeft className="size-4" /> Back to everything</Link>
      <div className="grid gap-7 lg:grid-cols-[1.35fr_0.65fr] lg:gap-10">
        <section>
          <div className="overflow-hidden rounded-2xl bg-muted">
            {item.imageUrls[0] ? (
              <button
                aria-label={`Open photo of ${item.name} in gallery`}
                className="group relative block w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
                onClick={() => setLightboxIndex(0)}
                type="button"
              >
                <img alt={`Photo of ${item.name}`} className="block h-auto w-full object-contain" src={item.imageUrls[0]} />
                <span aria-hidden="true" className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-card/90 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Maximize2 className="size-4" />
                </span>
              </button>
            ) : <div className={`grid aspect-[4/3] place-items-center ${item.category === "sell" ? "bg-sell-subtle text-sell-strong" : "bg-donate-subtle text-donate-strong"}`}><ImageIcon className="size-12 opacity-40" /></div>}
          </div>
          {item.imageUrls.length > 1 && <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">{item.imageUrls.slice(1).map((url, index) => (
            <button
              aria-label={`Open photo ${index + 2} of ${item.name} in gallery`}
              className="group relative block h-fit w-full overflow-hidden rounded-xl bg-muted text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              key={url}
              onClick={() => setLightboxIndex(index + 1)}
              type="button"
            >
              <img alt={`${item.name}, photo ${index + 2}`} className="block h-auto w-full object-contain" src={url} />
              <span aria-hidden="true" className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-full bg-card/90 text-foreground opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Maximize2 className="size-3.5" />
              </span>
            </button>
          ))}</div>}
          <Lightbox
            carousel={{ imageFit: "contain" }}
            close={() => setLightboxIndex(-1)}
            index={Math.max(lightboxIndex, 0)}
            open={lightboxIndex >= 0}
            slides={slides}
          />
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
