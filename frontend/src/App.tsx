import { lazy, Suspense, useEffect, useState } from "react";
import { UserButton } from "@clerk/react";
import { ClipboardCheck, House, ListTodo, PackageOpen, Plane } from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { StickyNotes } from "@/components/sticky-notes/sticky-notes";

const ItemsPage = lazy(() => import("@/components/items/items-page").then((module) => ({ default: module.ItemsPage })));
const ItemDetailPage = lazy(() => import("@/components/items/item-detail-page").then((module) => ({ default: module.ItemDetailPage })));
const TodoList = lazy(() => import("@/components/todos/todo-list").then((module) => ({ default: module.TodoList })));
const ClaimsDashboard = lazy(() => import("@/components/marketplace/claims-dashboard").then((module) => ({ default: module.ClaimsDashboard })));

type Departure = {
  name: string;
  /** Local departure date */
  date: Date;
  from: string;
  to: string;
  /** Semantic colour token driving the card's accent */
  accent: "ship" | "sell";
};

const departures: Departure[] = [
  {
    name: "Erin",
    date: new Date(2026, 9, 4),
    from: "LPL",
    to: "PDX",
    accent: "ship",
  },
  {
    name: "Peter",
    date: new Date(2026, 9, 7),
    from: "LPL",
    to: "BKK",
    accent: "sell",
  },
];

const accents = {
  ship: { rule: "bg-ship" },
  sell: { rule: "bg-sell" },
} as const;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Follow the OS colour scheme; index.css keys dark mode off the `dark` class. */
function useSystemTheme() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
}

/** The journey the whole plan is pointed at: where we leave from, where we land. */
const journey = {
  from: { city: "Liverpool", region: "England" },
  to: { city: "Portland", region: "Oregon" },
};

/** The countdown that heads the page tracks whoever leaves first. */
const nextDeparture = departures.reduce((soonest, departure) =>
  departure.date < soonest.date ? departure : soonest,
);

function remainingUntil(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1_000) % 60,
  };
}

/** Ticks once a second so the seconds column stays honest. */
function useCountdown(target: Date) {
  const [remaining, setRemaining] = useState(() => remainingUntil(target));
  useEffect(() => {
    const id = window.setInterval(() => setRemaining(remainingUntil(target)), 1_000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 border-border/70 px-1 py-4 not-first:border-l sm:gap-2 sm:px-4 sm:py-6">
      <span className="font-display text-4xl leading-none tabular-nums sm:text-display-sm">
        {String(value).padStart(2, "0")}
      </span>
      <span className="eyebrow text-[0.625rem] sm:text-eyebrow">{label}</span>
    </div>
  );
}

/** Hero: both ends of the move, the clock, and nothing else. */
function Hero() {
  const { days, hours, minutes, seconds } = useCountdown(nextDeparture.date);

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      {/* Both locations, as a boarding-pass route. */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-ship-subtle to-sell-subtle px-4 py-4 sm:gap-5 sm:px-8 sm:py-5">
        <div>
          <p className="font-display text-lg leading-tight sm:text-2xl">{journey.from.city}</p>
          <p className="eyebrow">{journey.from.region}</p>
        </div>
        <div className="flex flex-1 items-center gap-2 text-muted-foreground">
          <span className="h-px flex-1 border-t border-dashed border-current opacity-50" />
          <Plane className="size-4 shrink-0" />
          <span className="h-px flex-1 border-t border-dashed border-current opacity-50" />
        </div>
        <div className="text-right">
          <p className="font-display text-lg leading-tight sm:text-2xl">{journey.to.city}</p>
          <p className="eyebrow">{journey.to.region}</p>
        </div>
      </div>

      {/* The clock. */}
      <div className="grid grid-cols-4 px-2 sm:px-6">
        <CountdownCell label="Days" value={days} />
        <CountdownCell label="Hours" value={hours} />
        <CountdownCell label="Mins" value={minutes} />
        <CountdownCell label="Secs" value={seconds} />
      </div>

      {/*<p className="px-4 pb-5 text-center text-sm text-muted-foreground sm:px-8">
        until <span className="text-foreground">{nextDeparture.name}</span> flies
      </p>*/}

      {/* Who leaves when — the detail the countdown can only imply. */}
      <footer className="flex flex-col items-center justify-between gap-2 border-t border-border/70 px-4 py-4 md:flex-row">
        {departures.map((departure) => (
          <div className="flex items-center justify-start gap-3 text-sm" key={departure.name}>
            <span className="flex items-center gap-2">
              <span className={`size-1.5 rounded-full ${accents[departure.accent].rule}`} />
              {departure.name}
            </span>
            <span className="numeric text-xs text-muted-foreground">
              {departure.to} · {dateFormat.format(departure.date)}
            </span>
          </div>
        ))}
      </footer>
    </section>
  );
}

export default function App({
  convexEnabled = false,
  showAccountMenu = false,
}: {
  convexEnabled?: boolean;
  showAccountMenu?: boolean;
}) {
  useSystemTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const page = location.pathname.startsWith("/items") ? "items" : location.pathname.startsWith("/todo") ? "todo" : location.pathname.startsWith("/claims") ? "claims" : "home";

  useEffect(() => {
    const legacy = location.hash.match(/^#items(?:-(all|sell|ship|donate|trash|store))?$/);
    if (legacy) navigate(`/items/${legacy[1] ?? "all"}`, { replace: true });
    else if (location.hash === "#todo") navigate("/todo", { replace: true });
    else if (location.hash === "#home") navigate("/", { replace: true });
  }, [location.hash, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link className="flex items-center gap-2" to="/">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="size-4" />
            </span>
            <span className="font-display text-base sm:text-lg">
              move planner<span className="text-primary">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 rounded-xl bg-muted p-1" aria-label="Main navigation">
              <Link aria-label="Home" className={`flex items-center gap-2 rounded-lg p-2 text-sm transition-colors sm:px-3 sm:py-1.5 ${page === "home" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`} to="/">
                <House className="size-4" /> <span className="hidden sm:inline">Home</span>
              </Link>
              <Link aria-label="Items" className={`flex items-center gap-2 rounded-lg p-2 text-sm transition-colors sm:px-3 sm:py-1.5 ${page === "items" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`} to="/items/all">
                <PackageOpen className="size-4" /> <span className="hidden sm:inline">Items</span>
              </Link>
              <Link aria-label="Todo" className={`flex items-center gap-2 rounded-lg p-2 text-sm transition-colors sm:px-3 sm:py-1.5 ${page === "todo" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`} to="/todo">
                <ListTodo className="size-4" /> <span className="hidden sm:inline">Todo</span>
              </Link>
              <Link aria-label="Claims" className={`flex items-center gap-2 rounded-lg p-2 text-sm transition-colors sm:px-3 sm:py-1.5 ${page === "claims" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`} to="/claims">
                <ClipboardCheck className="size-4" /> <span className="hidden sm:inline">Claims</span>
              </Link>
            </nav>
            {showAccountMenu && <UserButton />}
          </div>
        </div>
      </header>

      <Suspense fallback={<main className="grid min-h-80 place-items-center text-sm text-muted-foreground">Loading…</main>}>
        <Routes>
          <Route path="/items" element={<Navigate replace to="/items/all" />} />
          <Route path="/items/:tab" element={<div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10"><ItemsPage enabled={convexEnabled} /></div>} />
          <Route path="/item/:itemId" element={<ItemDetailPage enabled={convexEnabled} />} />
          <Route path="/todo" element={<main className="mx-auto w-full max-w-3xl px-6 py-12"><TodoList enabled={convexEnabled} /></main>} />
          <Route path="/claims" element={<ClaimsDashboard enabled={convexEnabled} />} />
          <Route path="/" element={(
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12">
          <h1 className="sr-only">
            {journey.from.city} to {journey.to.city}
          </h1>

          <Hero />

          <StickyNotes enabled={convexEnabled} />
        </main>
          )} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </div>
  );
}
