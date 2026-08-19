# Design system

Pacific North West. The move ends in Portland, so the palette is taken from where
we're going: Douglas-fir green, coastal fog, and the damp, muted hues of the
Cascades rather than the usual SaaS grey-and-blue.

Everything lives in `src/index.css` as CSS custom properties, which is shadcn/ui's
variable contract — so every component added with `pnpm dlx shadcn@latest add …`
picks the system up with no per-component overrides.

View it running: `pnpm dev`, then <http://localhost:5173/#design>.

## Layers

`src/index.css` is ordered deliberately, and the order matters:

1. **Primitives** — the raw `--fir-*` and `--fog-*` ramps plus the category hues.
   Never reference these from a component; they have no light/dark behaviour.
2. **Semantic tokens** — `--background`, `--primary`, `--keep`, … defined once for
   light and again under `.dark`. This is what components consume.
3. **Theme** (`@theme inline`) — exposes the semantic tokens as Tailwind utilities.
   `inline` is what lets the `.dark` class swap colours without new classes.
4. **Scale** (`@theme`) — static type, elevation and easing values.
5. **Base** — element defaults.
6. **Utilities** — `eyebrow` and `numeric`.

## Colour

| Ramp | Role |
| --- | --- |
| `--fir-50…950` | Brand. Deep evergreen; drives primary, ring, `--chart-1`. |
| `--fog-50…950` | Cool neutral, used instead of grey so surfaces read overcast, not clinical. |

Semantic surfaces follow shadcn's names: `background`, `card`, `popover`, `muted`,
`secondary`, `accent`, `primary`, `border`, `input`, `ring`.

Feedback adds `success`, `warning`, `info` alongside the stock `destructive`, each
with a matching `-foreground`.

### Categories

The domain vocabulary. Every object in the house ends up in exactly one bucket, and
each bucket owns a hue so a colour never means two things:

| Category | Meaning | Hue |
| --- | --- | --- |
| `keep` | Coming with us, not boxed yet | Fern |
| `ship` | Boxed, headed for Portland | Sound |
| `sell` | Listed, or waiting to be | Madrona |
| `donate` | Charity shop or a friend | Huckleberry |
| `bin` | Recycling, tip run, rubbish | Salmon |

Each exposes three tokens:

- `--<name>` — solid, for dots, bars and chart series
- `--<name>-subtle` — tinted surface
- `--<name>-strong` — text/icon colour on that surface

Use them through `@/lib/design`, which is the single source of truth for labels,
icons and badge variants — don't hardcode a category colour at a call site:

```tsx
import { moveCategories, moveCategoryList } from "@/lib/design"
import { Badge } from "@/components/ui/badge"

const { label, icon: Icon, badge } = moveCategories.ship
<Badge variant={badge}><Icon />{label}</Badge>
```

`Badge` carries a variant per category (`keep` `ship` `sell` `donate` `bin`) and per
feedback tone (`success` `warning` `info`) on top of the stock shadcn variants.

## Typography

| Token | Face | Use |
| --- | --- | --- |
| `font-display` | Bricolage Grotesque Variable | Headings only. Chunky, sign-painterly, set at weight 600. |
| `font-sans` | Inter Variable | Everything you read. The default on `body`. |
| `font-mono` | JetBrains Mono Variable | Anything countable — dates, counts, prices, box IDs. |

Display sizes are `text-display-xs` through `text-display-xl`, each carrying its own
line-height, tracking and weight. Body text uses Tailwind's stock `text-*` scale.

Two utilities:

- `eyebrow` — small, spaced, muted label above a heading
- `numeric` — mono + tabular figures, so numbers don't jitter as they update

## Elevation, radius, motion

Shadows (`shadow-xs` … `shadow-xl`) are tinted with the darkest fog rather than
black, so lifted surfaces stay in the same cool light as everything else. Radius
derives from a single `--radius` (`0.75rem`) — change that one value to re-round the whole app. Easings beyond
Tailwind's defaults: `ease-out-quart` (settling) and `ease-spring` (overshoot).

## Accessibility

Every foreground/background pairing the system promises clears WCAG AA (4.5:1) in
both light and dark. That's enforced, not assumed:

```sh
pnpm check:contrast
```

The script converts the OKLCH tokens to sRGB and exits non-zero on a regression, so
retuning a colour can't quietly break contrast.

## Adding components

```sh
pnpm dlx shadcn@latest add <component>
```

Components land in `src/components/ui` and inherit the tokens automatically. The
path alias is declared in both `tsconfig.json` and `tsconfig.app.json` — the shadcn
CLI reads the root config, so removing it there makes the CLI write to a literal
`@/` directory instead.
