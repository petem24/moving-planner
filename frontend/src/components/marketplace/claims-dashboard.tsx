import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowUpDown, Gift, Search, Tag, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "../../../../backend/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { sampleItems } from "@/components/items/items-page";

type ClaimRow = {
  id: string;
  name: string;
  category: "sell" | "donate";
  room?: string;
  quantity: number;
  status: string;
  estimatedValue?: number;
  soldPrice?: number;
  claimedBy?: string;
  claimedAt?: number;
};

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type ViewFilter = "all" | "claimed" | "unclaimed";
type CategoryFilter = "all" | "sell" | "donate";
type SortKey = "name" | "category" | "claimedBy" | "claimedAt" | "status";

export function ClaimsDashboard({ enabled }: { enabled: boolean }) {
  return enabled ? <ConnectedClaimsDashboard /> : <PreviewClaimsDashboard />;
}

function ConnectedClaimsDashboard() {
  const rows = useQuery(api.marketplace.claimsDashboard);
  if (rows === undefined) return <ClaimsLoading />;
  return <ClaimsTable rows={rows} />;
}

function PreviewClaimsDashboard() {
  const claims = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("preview-marketplace-claims") ?? "{}") as Record<string, string>;
    } catch {
      return {};
    }
  }, []);

  const rows: ClaimRow[] = sampleItems
    .filter((item) => item.category === "sell" || item.category === "donate")
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category as "sell" | "donate",
      room: item.room,
      quantity: item.quantity,
      status: item.status,
      estimatedValue: item.estimatedValue,
      soldPrice: item.soldPrice,
      claimedBy: claims[item.id],
    }));

  return <ClaimsTable preview rows={rows} />;
}

function ClaimsTable({ rows, preview = false }: { rows: ClaimRow[]; preview?: boolean }) {
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("claimedBy");
  const [descending, setDescending] = useState(false);

  const counts = useMemo(() => ({
    total: rows.length,
    claimed: rows.filter((row) => row.claimedBy).length,
    unclaimed: rows.filter((row) => !row.claimedBy).length,
    forSale: rows.filter((row) => row.category === "sell").length,
    donate: rows.filter((row) => row.category === "donate").length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return rows
      .filter((row) => categoryFilter === "all" || row.category === categoryFilter)
      .filter((row) => viewFilter === "all" || (viewFilter === "claimed" ? Boolean(row.claimedBy) : !row.claimedBy))
      .filter((row) => !query || [row.name, row.room, row.claimedBy, row.category].some((value) => (value ?? "").toLocaleLowerCase().includes(query)))
      .sort((first, second) => {
        const firstValue = sortValue(first, sortKey);
        const secondValue = sortValue(second, sortKey);
        const result = firstValue.localeCompare(secondValue, "en-GB", { numeric: true, sensitivity: "base" });
        return descending ? -result : result;
      });
  }, [categoryFilter, descending, rows, search, sortKey, viewFilter]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) setDescending((current) => !current);
    else {
      setSortKey(key);
      setDescending(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 pb-16 sm:px-6 sm:py-10">
      <header>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Users className="size-5" /></span>
          <div>
            <p className="eyebrow">Marketplace admin</p>
            <h1 className="mt-1 font-display text-display-xs">Claims</h1>
            <p className="mt-1 text-sm text-muted-foreground">See who has claimed each item for sale or donation.</p>
          </div>
        </div>
      </header>

      {preview && <p className="text-xs text-muted-foreground">Sample items until the inventory database is connected.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="All items" value={counts.total} />
        <SummaryCard label="Claimed" value={counts.claimed} accent="text-success" />
        <SummaryCard label="Waiting" value={counts.unclaimed} accent="text-warning" />
        <SummaryCard label="For sale · Free" value={`${counts.forSale} · ${counts.donate}`} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter claim status">
            <FilterButton active={viewFilter === "all"} onClick={() => setViewFilter("all")}>All <span className="opacity-60">{counts.total}</span></FilterButton>
            <FilterButton active={viewFilter === "claimed"} onClick={() => setViewFilter("claimed")}>Claimed <span className="opacity-60">{counts.claimed}</span></FilterButton>
            <FilterButton active={viewFilter === "unclaimed"} onClick={() => setViewFilter("unclaimed")}>Waiting <span className="opacity-60">{counts.unclaimed}</span></FilterButton>
            <span className="mx-1 hidden w-px bg-border sm:block" />
            <FilterButton active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>Everything</FilterButton>
            <FilterButton active={categoryFilter === "sell"} onClick={() => setCategoryFilter("sell")}><Tag className="size-3.5" /> For sale</FilterButton>
            <FilterButton active={categoryFilter === "donate"} onClick={() => setCategoryFilter("donate")}><Gift className="size-3.5" /> Donate</FilterButton>
          </div>
          <label className="relative block sm:max-w-sm">
            <span className="sr-only">Search claims</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" onChange={(event) => setSearch(event.target.value)} placeholder="Search items or people…" value={search} />
          </label>
        </div>

        {filteredRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <SortableHeader label="Item" sortKey="name" activeKey={sortKey} descending={descending} onSort={setSort} />
                  <SortableHeader label="Type" sortKey="category" activeKey={sortKey} descending={descending} onSort={setSort} />
                  <th className="border-b border-border px-4 py-2.5 font-medium">Qty</th>
                  <SortableHeader label="Claimed by" sortKey="claimedBy" activeKey={sortKey} descending={descending} onSort={setSort} />
                  <SortableHeader label="Claimed on" sortKey="claimedAt" activeKey={sortKey} descending={descending} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" activeKey={sortKey} descending={descending} onSort={setSort} />
                  <th className="border-b border-border px-4 py-2.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr className="border-b border-border/70 last:border-0 hover:bg-muted/35" key={row.id}>
                    <td className="px-4 py-3"><Link className="font-medium text-foreground hover:text-primary hover:underline" to={`/item/${row.id}`}>{row.name}</Link><span className="mt-0.5 block text-xs text-muted-foreground">{row.room ?? "No room"}</span></td>
                    <td className="px-4 py-3"><CategoryBadge category={row.category} /></td>
                    <td className="px-4 py-3 numeric text-muted-foreground">{row.quantity}</td>
                    <td className="px-4 py-3">{row.claimedBy ? <span className="font-medium text-foreground">{row.claimedBy}</span> : <span className="text-muted-foreground">Not claimed</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.claimedAt ? dateFormat.format(row.claimedAt) : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 numeric text-muted-foreground">{row.category === "sell" ? row.soldPrice !== undefined ? money.format(row.soldPrice) : row.estimatedValue !== undefined ? `Asking ${money.format(row.estimatedValue)}` : "—" : "Free"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-48 place-items-center px-6 py-10 text-center"><div><p className="font-medium">No matching items</p><p className="mt-1 text-sm text-muted-foreground">Try a different filter or search.</p></div></div>
        )}

        <footer className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span>{filteredRows.length} of {rows.length} items</span>
          <span>{counts.claimed} claimed</span>
        </footer>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, accent = "text-foreground" }: { label: string; value: number | string; accent?: string }) {
  return <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 font-display text-2xl ${accent}`}>{value}</p></div>;
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button aria-pressed={active} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`} onClick={onClick} type="button">{children}</button>;
}

function SortableHeader({ activeKey, descending, label, onSort, sortKey }: { activeKey: SortKey; descending: boolean; label: string; onSort: (key: SortKey) => void; sortKey: SortKey }) {
  return <th className="border-b border-border px-4 py-2.5 font-medium"><button className="inline-flex items-center gap-1.5 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSort(sortKey)} type="button">{label}<ArrowUpDown className={`size-3.5 ${activeKey === sortKey ? "text-foreground" : "opacity-40"}`} />{activeKey === sortKey && <span className="sr-only">{descending ? "descending" : "ascending"}</span>}</button></th>;
}

function CategoryBadge({ category }: { category: "sell" | "donate" }) {
  return <Badge variant={category}>{category === "sell" ? "For sale" : "Donate"}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const finished = ["sold", "donated", "disposed", "shipped", "stored", "complete"].includes(status);
  const active = ["claimed", "in_progress", "packed"].includes(status);
  return <Badge variant={finished ? "success" : active ? "warning" : "outline"}>{statusLabel(status)}</Badge>;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    for_sale: "For sale",
    sold: "Sold",
    available: "Available",
    claimed: "Claimed",
    donated: "Donated",
    pending: "To do",
    in_progress: "In progress",
    complete: "Done",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function sortValue(row: ClaimRow, key: SortKey) {
  if (key === "claimedBy") return row.claimedBy ?? "zzzz";
  if (key === "claimedAt") return row.claimedAt ? String(row.claimedAt).padStart(14, "0") : "99999999999999";
  if (key === "category") return row.category === "sell" ? "For sale" : "Donate";
  if (key === "status") return row.status === "complete" ? "Done" : row.status === "in_progress" ? "In progress" : "To do";
  return row[key];
}

function ClaimsLoading() {
  return <main className="grid min-h-80 place-items-center text-sm text-muted-foreground">Loading claims…</main>;
}
