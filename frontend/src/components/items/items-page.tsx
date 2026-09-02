import { useLayoutEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Gift,
  House,
  LayoutGrid,
  List,
  Plus,
  Search,
  Ship,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { Popover } from "radix-ui";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../../../../backend/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ItemForm } from "./item-form";
import type { Category, InventoryItem, ItemStatus, NewInventoryItem } from "./inventory-types";
import { finishedStatuses, initialStatus, statusLabels } from "./inventory-status";

/** The "all" tab is a table like any other, just without a category filter applied. */
type Tab = "all" | Category;

type Column = {
  key: keyof InventoryItem;
  label: string;
  className?: string;
  render?: (item: InventoryItem) => React.ReactNode;
};

type SortDirection = "asc" | "desc";
type ViewMode = "table" | "grid";
type StatusFilter = "all" | "active" | "finished";
type ImageUrlMap = Record<string, string | null>;

const categoryOrder: Category[] = ["sell", "ship", "donate", "trash", "store"];

const categoryMeta: Record<
  Category,
  { label: string; short: string; icon: LucideIcon; accent: string; tint: string; strong: string }
> = {
  sell: {
    label: "Selling",
    short: "Sell",
    icon: Tag,
    accent: "bg-sell",
    tint: "bg-sell-subtle",
    strong: "text-sell-strong",
  },
  ship: {
    label: "Shipping",
    short: "Ship",
    icon: Ship,
    accent: "bg-ship",
    tint: "bg-ship-subtle",
    strong: "text-ship-strong",
  },
  donate: {
    label: "Donate",
    short: "Donate",
    icon: Gift,
    accent: "bg-donate",
    tint: "bg-donate-subtle",
    strong: "text-donate-strong",
  },
  trash: {
    label: "Trash",
    short: "Trash",
    icon: Trash2,
    accent: "bg-bin",
    tint: "bg-bin-subtle",
    strong: "text-bin-strong",
  },
  store: {
    label: "Store",
    short: "Store",
    icon: House,
    accent: "bg-keep",
    tint: "bg-keep-subtle",
    strong: "text-keep-strong",
  },
};

const tabOrder: Tab[] = ["all", ...categoryOrder];

const tabMeta: Record<Tab, { label: string; short: string; icon: LucideIcon; tint: string; strong: string }> = {
  all: { label: "Everything", short: "All", icon: LayoutGrid, tint: "bg-muted", strong: "text-foreground" },
  ...categoryMeta,
};

export const sampleItems: InventoryItem[] = [
  { id: "s1", name: "Nintendo Switch", category: "sell", room: "Living Room", quantity: 1, status: "for_sale", estimatedValue: 180, marketplaceLink: "https://www.facebook.com/marketplace" },
  { id: "s2", name: "Coffee machine", category: "sell", room: "Kitchen", quantity: 1, status: "for_sale", estimatedValue: 75 },
  { id: "s3", name: "Couch", category: "sell", room: "Living Room", quantity: 1, status: "for_sale", estimatedValue: 220 },
  { id: "s4", name: "TV", category: "sell", room: "Living Room", quantity: 1, status: "sold", owner: "Beth", soldPrice: 140 },
  { id: "sh1", name: "Record player", category: "ship", room: "Living Room", quantity: 1, status: "to_pack", owner: "Erin", destination: "October shipment" },
  { id: "sh2", name: "PC", category: "ship", room: "Office", quantity: 1, status: "packed", owner: "Peter", destination: "Spring shipment" },
  { id: "sh3", name: "Art prints", category: "ship", room: "Living Room", quantity: 6, status: "shipped", destination: "Box 04" },
  { id: "d1", name: "Ivy plant", category: "donate", room: "Living Room", quantity: 1, status: "claimed", donationLocation: "Beth" },
  { id: "d2", name: "Computer monitor / iPad", category: "donate", room: "Office", quantity: 1, status: "available", donationLocation: "Emile", notes: "Give back to Emile" },
  { id: "d3", name: "Bath towels", category: "donate", room: "Bathroom", quantity: 4, status: "available", donationLocation: "Charity shop" },
  { id: "t1", name: "Old cards", category: "trash", room: "Living Room", quantity: 1, status: "to_dispose", destination: "Recycling" },
  { id: "t2", name: "Vacuum", category: "trash", room: "Hall Closet", quantity: 1, status: "to_dispose", destination: "Council tip" },
  { id: "t3", name: "Mattress", category: "trash", room: "Bedroom", quantity: 1, status: "to_dispose", destination: "Bulky collection" },
  { id: "st1", name: "Winter coats", category: "store", room: "Hall Closet", quantity: 3, status: "to_store", owner: "Peter", destination: "Mum's loft" },
  { id: "st2", name: "Travel documents", category: "store", room: "Office", quantity: 1, status: "stored", owner: "Peter", destination: "Carry-on" },
];

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const baseColumns: Column[] = [
  { key: "name", label: "Item", className: "min-w-56", render: (item) => <span className="font-medium text-foreground">{item.name}</span> },
  { key: "room", label: "Room", className: "min-w-36" },
  { key: "quantity", label: "Qty", className: "w-20", render: (item) => <span className="numeric">{item.quantity}</span> },
];

const statusColumn: Column = {
  key: "status",
  label: "Status",
  className: "min-w-32",
  render: (item) => <StatusPill status={item.status} />,
};

const categoryColumn: Column = {
  key: "category",
  label: "Type",
  className: "min-w-32",
  render: (item) => <CategoryTag category={item.category} />,
};

const columnsByCategory: Record<Category, Column[]> = {
  sell: [
    ...baseColumns,
    { key: "owner", label: "Owner", className: "min-w-28" },
    { key: "estimatedValue", label: "Asking", className: "min-w-28", render: (item) => item.estimatedValue !== undefined ? <span className="numeric">{money.format(item.estimatedValue)}</span> : "—" },
    { key: "soldPrice", label: "Sold for", className: "min-w-28", render: (item) => item.soldPrice !== undefined ? <span className="numeric">{money.format(item.soldPrice)}</span> : "—" },
    { key: "marketplaceLink", label: "Listing", className: "w-24", render: (item) => item.marketplaceLink ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={item.marketplaceLink} onClick={(event) => event.stopPropagation()} rel="noreferrer" target="_blank">Open <ExternalLink className="size-3" /></a> : "—" },
    statusColumn,
  ],
  ship: [
    ...baseColumns,
    { key: "owner", label: "Travelling with", className: "min-w-36" },
    { key: "destination", label: "Shipment / box", className: "min-w-40" },
    statusColumn,
    { key: "notes", label: "Notes", className: "min-w-48" },
  ],
  donate: [
    ...baseColumns,
    { key: "donationLocation", label: "Going to", className: "min-w-40" },
    statusColumn,
    { key: "notes", label: "Notes", className: "min-w-48" },
  ],
  trash: [
    ...baseColumns,
    { key: "destination", label: "Disposal route", className: "min-w-40" },
    statusColumn,
    { key: "notes", label: "Notes", className: "min-w-48" },
  ],
  store: [
    ...baseColumns,
    { key: "owner", label: "Owner", className: "min-w-28" },
    { key: "destination", label: "Stored at / with", className: "min-w-44" },
    statusColumn,
    { key: "notes", label: "Notes", className: "min-w-48" },
  ],
};

const columnsByTab: Record<Tab, Column[]> = {
  all: [
    baseColumns[0],
    categoryColumn,
    ...baseColumns.slice(1),
    statusColumn,
    { key: "notes", label: "Notes", className: "min-w-48" },
  ],
  ...columnsByCategory,
};

export function ItemsPage({ enabled }: { enabled: boolean }) {
  return enabled ? <ConnectedItemsPage /> : <PreviewItemsPage />;
}

function ConnectedItemsPage() {
  const items = useQuery(api.inventory.list);
  const createItem = useMutation(api.inventory.create);
  const firstImageIds = useMemo(
    () => [...new Set((items ?? []).flatMap((item) => item.images?.slice(0, 1) ?? []))],
    [items],
  );
  const imageUrls = useQuery(api.inventory.imageUrls, items ? { ids: firstImageIds } : "skip");
  if (!items) return <ItemsLoading />;

  return (
    <ItemsWorkspace
      items={items.map((item) => ({
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
      }))}
      imageUrls={imageUrls}
      onCreate={async (item) => {
        await createItem(item);
      }}
    />
  );
}

function PreviewItemsPage() {
  const [items, setItems] = useState(loadPreviewItems);

  return (
    <ItemsWorkspace
      items={items}
      onCreate={async (item) => {
        setItems((current) => {
          const next = [{ ...item, id: `preview-${Date.now()}`, status: initialStatus(item.category) }, ...current];
          sessionStorage.setItem("preview-inventory", JSON.stringify(next));
          return next;
        });
      }}
      preview
    />
  );
}

export function loadPreviewItems(): InventoryItem[] {
  try {
    const stored = sessionStorage.getItem("preview-inventory");
    return stored ? JSON.parse(stored) as InventoryItem[] : sampleItems;
  } catch {
    return sampleItems;
  }
}

export function savePreviewItem(updated: InventoryItem) {
  const next = loadPreviewItems().map((item) => item.id === updated.id ? updated : item);
  sessionStorage.setItem("preview-inventory", JSON.stringify(next));
}

function ItemsWorkspace({ items, imageUrls = {}, onCreate, preview = false }: { items: InventoryItem[]; imageUrls?: ImageUrlMap; onCreate: (item: NewInventoryItem) => Promise<void>; preview?: boolean }) {
  const { tab: routeTab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = routeTab as Tab;
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectTab = (tab: Tab) => {
    const keepGridView = new URLSearchParams(location.search).get("view") === "grid";
    navigate(`/items/${tab}${keepGridView ? "?view=grid" : ""}`);
  };

  useLayoutEffect(() => {
    const key = `inventory-scroll:${location.pathname}${location.search}`;
    const stored = sessionStorage.getItem(key);
    if (stored === null) return;
    const position = Number(stored);
    sessionStorage.removeItem(key);
    requestAnimationFrame(() => window.scrollTo({ top: position, behavior: "instant" }));
  }, [location.pathname, location.search, items.length]);

  if (!tabOrder.includes(activeTab)) return <Navigate replace to="/items/all" />;

  const saveItem = async (item: NewInventoryItem) => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await onCreate(item);
      setShowForm(false);
      selectTab(item.category);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to add this item");
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    if (isSaving) return;
    setSaveError(null);
    setShowForm(false);
  };

  return (
    <main className="flex flex-col gap-4 pb-16">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-xs">Items</h1>
          <p className="mt-1 text-sm text-muted-foreground">Decide what’s coming, going, or staying behind.</p>
        </div>
        <Button className="shrink-0" onClick={() => { setSaveError(null); setShowForm(true); }} size="lg">
          <Plus />
          Add item
        </Button>
      </header>

      {/* Compact table switcher: icon-only when idle on mobile, so every tab fits one row. */}
      <nav
        aria-label="Item tables"
        className="sticky top-3 z-20 flex items-center gap-1 rounded-2xl border border-border bg-card/90 p-1 shadow-sm backdrop-blur sm:gap-2 sm:p-2"
        role="tablist"
      >
        {tabOrder.map((tab) => {
          const meta = tabMeta[tab];
          const Icon = meta.icon;
          const active = activeTab === tab;
          const count = itemsForTab(items, tab).reduce((total, item) => total + item.quantity, 0);
          return (
            <button
              aria-controls={`${tab}-panel`}
              aria-selected={active}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-1 md:px-3 ${active ? "flex-1 bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              key={tab}
              onClick={() => selectTab(tab)}
              role="tab"
              title={meta.label}
              type="button"
            >
              <Icon className={`size-4 shrink-0 ${meta.strong}`} />
              <span className={`truncate ${active ? "" : "hidden md:inline"}`}>{meta.short}</span>
              <span className={`numeric shrink-0 rounded-md bg-muted px-1 py-0.5 text-[11px] text-muted-foreground ${active ? "" : "hidden md:inline"}`}>{count}</span>
            </button>
          );
        })}
      </nav>

      {preview && (
        <p className="text-xs text-muted-foreground">Sample items until the inventory database is connected. Items you add here last for this session.</p>
      )}

      <InventoryTable imageUrls={imageUrls} items={itemsForTab(items, activeTab)} tab={activeTab} />

      {showForm && (
        <ItemForm
          defaultCategory={activeTab === "all" ? "ship" : activeTab}
          error={saveError}
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={saveItem}
          preview={preview}
        />
      )}
    </main>
  );
}

function itemsForTab(items: InventoryItem[], tab: Tab) {
  return tab === "all" ? items : items.filter((item) => item.category === tab);
}

function InventoryTable({ imageUrls, items, tab }: { imageUrls: ImageUrlMap; items: InventoryItem[]; tab: Tab }) {
  const meta = tabMeta[tab];
  const columns = columnsByTab[tab];
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const search = params.get("q") ?? "";
  const room = params.get("room") ?? "all";
  const rawStatus = params.get("status");
  const status: StatusFilter = rawStatus === "active" || rawStatus === "finished" ? rawStatus : "all";
  const rawSortKey = params.get("sort") as keyof InventoryItem | null;
  const sortKey = columns.some((column) => column.key === rawSortKey) ? rawSortKey! : "name";
  const sortDirection: SortDirection = params.get("dir") === "desc" ? "desc" : "asc";
  const view: ViewMode = params.get("view") === "grid" ? "grid" : "table";

  const setParam = (key: string, value: string, defaultValue = "") => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === defaultValue) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  const setSearch = (value: string) => setParam("q", value);
  const setRoom = (value: string) => setParam("room", value, "all");
  const setStatus = (value: StatusFilter) => setParam("status", value, "all");
  const setView = (value: ViewMode) => setParam("view", value, "table");

  const rooms = useMemo(() => [...new Set(items.flatMap((item) => item.room ? [item.room] : []))].sort(), [items]);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items
      .filter((item) => room === "all" || item.room === room)
      .filter((item) => status === "all" || (status === "finished") === finishedStatuses.has(item.status))
      .filter((item) => !query || Object.entries(item).some(([key, value]) =>
        key !== "id" && String(key === "category" ? categoryMeta[value as Category].label : value ?? "").toLocaleLowerCase().includes(query),
      ))
      .sort((first, second) => compareValues(first[sortKey], second[sortKey], sortDirection));
  }, [items, room, search, sortDirection, sortKey, status]);

  const setSort = (key: keyof InventoryItem) => {
    const nextDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (key === "name") next.delete("sort"); else next.set("sort", key);
      if (nextDirection === "asc") next.delete("dir"); else next.set("dir", nextDirection);
      return next;
    }, { replace: true });
  };

  const openItem = (item: InventoryItem) => {
    const returnTo = `${location.pathname}${location.search}`;
    sessionStorage.setItem(`inventory-scroll:${returnTo}`, String(window.scrollY));
    sessionStorage.setItem(`inventory-return:${item.id}`, returnTo);
    navigate(`/item/${item.id}`, { state: { returnTo } });
  };

  return (
    <section aria-label={meta.label} id={`${tab}-panel`} role="tabpanel">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* One toolbar row on mobile — detailed filter and sort controls hide in the popover. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-2 sm:p-3">
          <label className="relative min-w-0 flex-1 md:min-w-52">
            <span className="sr-only">Search {meta.label.toLocaleLowerCase()}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" onChange={(event) => setSearch(event.target.value)} placeholder="Search…" value={search} />
          </label>

          <FilterPopover
            columns={columns}
            onClear={() => {
              setParams((current) => {
                const next = new URLSearchParams(current);
                ["room", "status", "sort", "dir"].forEach((key) => next.delete(key));
                return next;
              }, { replace: true });
            }}
            room={room}
            rooms={rooms}
            setRoom={setRoom}
            setSort={setSort}
            sortDirection={sortDirection}
            sortKey={sortKey}
            setStatus={setStatus}
            status={status}
          />

          <div aria-label="Display items as" className="flex shrink-0 rounded-lg border border-input bg-background p-0.5" role="group">
            <button aria-label="Table view" aria-pressed={view === "table"} className={`grid size-8 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "table" ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setView("table")} title="Table view" type="button">
              <List className="size-4" />
            </button>
            <button aria-label="Grid view" aria-pressed={view === "grid"} className={`grid size-8 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${view === "grid" ? "bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setView("grid")} title="Grid view" type="button">
              <LayoutGrid className="size-4" />
            </button>
          </div>

          <label className="hidden md:block">
            <span className="sr-only">Filter by room</span>
            <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" onChange={(event) => setRoom(event.target.value)} value={room}>
              <option value="all">All rooms</option>
              {rooms.map((itemRoom) => <option key={itemRoom}>{itemRoom}</option>)}
            </select>
          </label>
          <label className="hidden md:block">
            <span className="sr-only">Filter by status</span>
            <select className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" onChange={(event) => setStatus(event.target.value as StatusFilter)} value={status}>
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="finished">Finished</option>
            </select>
          </label>
        </div>

        {view === "table" && <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th className={`border-b border-border px-4 py-2.5 font-medium ${column.className ?? ""}`} key={column.key} scope="col">
                    <button className="group inline-flex items-center gap-1.5 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSort(column.key)} type="button">
                      {column.label}
                      <SortIcon active={sortKey === column.key} direction={sortDirection} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  aria-label={`Open ${item.name}`}
                  className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/35 focus:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring focus-within:bg-muted/35"
                  key={item.id}
                  onClick={() => openItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openItem(item);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                >
                  {columns.map((column) => (
                    <td className={`px-4 py-3 text-muted-foreground ${column.className ?? ""}`} key={column.key}>
                      {column.render ? column.render(item) : String(item[column.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

        {view === "table" && <div className="divide-y divide-border md:hidden">
          {filteredItems.map((item) => (
            <ItemRow item={item} key={item.id} onOpen={() => openItem(item)} showCategory={tab === "all"} />
          ))}
        </div>}

        {view === "grid" && filteredItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-4 xl:grid-cols-5">
            {filteredItems.map((item) => (
              <ItemGridCard imageUrls={imageUrls} item={item} key={item.id} onOpen={() => openItem(item)} showCategory={tab === "all"} />
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="grid place-items-center gap-1 px-6 py-10 text-center">
            <p className="text-sm font-medium">{items.length === 0 ? (tab === "all" ? "No items yet" : `Nothing in ${meta.label.toLocaleLowerCase()} yet`) : "No matching items"}</p>
            <p className="text-xs text-muted-foreground">{items.length === 0 ? "Items added here will appear in this view." : "Try clearing a filter or changing your search."}</p>
          </div>
        )}

        <footer className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span>{filteredItems.length} of {items.length} items</span>
          <span className="numeric">{filteredItems.reduce((total, item) => total + item.quantity, 0)} items</span>
        </footer>
      </div>
    </section>
  );
}

/** Mobile row: selecting it opens the complete, editable item page. */
function ItemRow({ item, onOpen, showCategory = false }: { item: InventoryItem; onOpen: () => void; showCategory?: boolean }) {
  return (
    <button className="block w-full px-4 py-3 text-left hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onClick={onOpen} type="button">
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{item.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {showCategory && <CategoryTag category={item.category} compact />}
          {item.room ?? "No room"}
          {item.quantity > 1 && <> <span aria-hidden="true">·</span> <span className="numeric">×{item.quantity}</span></>}
        </p>
      </div>
      <StatusPill status={item.status} />
    </div>
    </button>
  );
}

function ItemGridCard({ imageUrls, item, onOpen, showCategory = false }: { imageUrls: ImageUrlMap; item: InventoryItem; onOpen: () => void; showCategory?: boolean }) {
  const firstImageId = item.images?.[0];
  const imageUrl = firstImageId ? imageUrls[firstImageId] : null;
  const meta = categoryMeta[item.category];
  const CategoryIcon = meta.icon;

  return (
    <button className="group min-w-0 overflow-hidden rounded-xl border border-border bg-background text-left shadow-xs transition hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30" onClick={onOpen} type="button">
      <div className={`relative aspect-[4/3] overflow-hidden ${meta.tint}`}>
        {firstImageId && imageUrl === undefined ? (
          <div aria-label="Loading photo" className="h-full w-full animate-pulse bg-muted" role="status" />
        ) : imageUrl ? (
          <img alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" src={imageUrl} />
        ) : (
          <div className={`grid h-full place-items-center ${meta.strong}`}>
            <CategoryIcon className="size-9 opacity-55" />
          </div>
        )}
        <div className="absolute top-2 right-2"><StatusPill status={item.status} /></div>
      </div>
      <div className="p-3">
        <p className="truncate font-medium text-foreground">{item.name}</p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {showCategory && <CategoryTag category={item.category} compact />}
          <span className="truncate">{item.room ?? "No room"}</span>
          {item.quantity > 1 && <span className="numeric shrink-0">×{item.quantity}</span>}
        </div>
      </div>
    </button>
  );
}

/** Room, status and sort live here on mobile so the table starts near the top of the screen. */
function FilterPopover({
  columns,
  onClear,
  room,
  rooms,
  setRoom,
  setSort,
  setStatus,
  sortDirection,
  sortKey,
  status,
}: {
  columns: Column[];
  onClear: () => void;
  room: string;
  rooms: string[];
  setRoom: (room: string) => void;
  setSort: (key: keyof InventoryItem) => void;
  setStatus: (status: StatusFilter) => void;
  sortDirection: SortDirection;
  sortKey: keyof InventoryItem;
  status: StatusFilter;
}) {
  const activeCount = (room === "all" ? 0 : 1) + (status === "all" ? 0 : 1);

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="Filter and sort"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-expanded:bg-muted md:hidden"
        type="button"
      >
        <SlidersHorizontal className="size-4" />
        {activeCount > 0 && <span className="numeric rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">{activeCount}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-40 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card p-3 shadow-lg"
          collisionPadding={12}
          sideOffset={8}
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">Filter &amp; sort</span>
            <Popover.Close aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:text-foreground" type="button">
              <X className="size-4" />
            </Popover.Close>
          </div>

          <FilterGroup label="Room">
            <Chip active={room === "all"} onClick={() => setRoom("all")}>All</Chip>
            {rooms.map((itemRoom) => (
              <Chip active={room === itemRoom} key={itemRoom} onClick={() => setRoom(itemRoom)}>{itemRoom}</Chip>
            ))}
          </FilterGroup>

          <FilterGroup label="Status">
            <Chip active={status === "all"} onClick={() => setStatus("all")}>Any</Chip>
            <Chip active={status === "active"} onClick={() => setStatus("active")}>Active</Chip>
            <Chip active={status === "finished"} onClick={() => setStatus("finished")}>Finished</Chip>
          </FilterGroup>

          <FilterGroup label="Sort by">
            {columns.map((column) => (
              <Chip active={sortKey === column.key} key={column.key} onClick={() => setSort(column.key)}>
                {column.label}
                {sortKey === column.key && (sortDirection === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
              </Chip>
            ))}
          </FilterGroup>

          <button
            className="mt-3 w-full rounded-lg border border-border py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClear}
            type="button"
          >
            Reset
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FilterGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CategoryTag({ category, compact = false }: { category: Category; compact?: boolean }) {
  const meta = categoryMeta[category];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${meta.tint} ${meta.strong}`}>
      <Icon className="size-3" />
      {compact ? meta.short : meta.label}
    </span>
  );
}

function StatusPill({ status }: { status: ItemStatus }) {
  const classes = finishedStatuses.has(status)
    ? "bg-keep-subtle text-keep-strong"
    : status === "claimed" || status === "packed"
      ? "bg-ship-subtle text-ship-strong"
      : "bg-muted text-muted-foreground";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${classes}`}>{statusLabels[status]}</span>;
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="size-3 opacity-35 group-hover:opacity-70" />;
  return direction === "asc" ? <ArrowUp className="size-3 text-foreground" /> : <ArrowDown className="size-3 text-foreground" />;
}

function compareValues(first: InventoryItem[keyof InventoryItem], second: InventoryItem[keyof InventoryItem], direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  if (typeof first === "number" && typeof second === "number") return (first - second) * multiplier;
  return String(first ?? "").localeCompare(String(second ?? ""), "en", { numeric: true, sensitivity: "base" }) * multiplier;
}

function ItemsLoading() {
  return (
    <main className="flex min-h-80 items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading inventory…</p>
    </main>
  );
}
