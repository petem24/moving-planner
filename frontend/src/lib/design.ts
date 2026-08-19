import { Gift, House, Ship, Tag, Trash2, type LucideIcon } from "lucide-react"

import type { badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

/**
 * The five decisions every object in the house ends up in. This is the
 * design system's domain vocabulary: each category owns a hue, a badge
 * variant, and an icon, and nothing else in the app should invent its own.
 */
export const MOVE_CATEGORIES = ["keep", "ship", "sell", "donate", "bin"] as const

export type MoveCategory = (typeof MOVE_CATEGORIES)[number]

export type MoveCategoryMeta = {
  label: string
  description: string
  icon: LucideIcon
  /** Badge variant defined in @/components/ui/badge */
  badge: Extract<BadgeVariant, MoveCategory>
  /** Solid colour utility, for dots, bars and chart series */
  dot: string
  /** CSS custom property holding the solid colour */
  token: `--${MoveCategory}`
}

export const moveCategories: Record<MoveCategory, MoveCategoryMeta> = {
  keep: {
    label: "Keep",
    description: "Coming with us, but not in a box yet.",
    icon: House,
    badge: "keep",
    dot: "bg-keep",
    token: "--keep",
  },
  ship: {
    label: "Ship",
    description: "Boxed and headed for Portland.",
    icon: Ship,
    badge: "ship",
    dot: "bg-ship",
    token: "--ship",
  },
  sell: {
    label: "Sell",
    description: "Listed, or waiting to be listed.",
    icon: Tag,
    badge: "sell",
    dot: "bg-sell",
    token: "--sell",
  },
  donate: {
    label: "Donate",
    description: "Off to a charity shop or a friend.",
    icon: Gift,
    badge: "donate",
    dot: "bg-donate",
    token: "--donate",
  },
  bin: {
    label: "Bin",
    description: "Recycling, tip run, or genuine rubbish.",
    icon: Trash2,
    badge: "bin",
    dot: "bg-bin",
    token: "--bin",
  },
}

/** Ordered list, for legends, filters and tab bars. */
export const moveCategoryList = MOVE_CATEGORIES.map((key) => ({
  key,
  ...moveCategories[key],
}))

/** Chart series colours, in the order the design system intends them to be used. */
export const chartSeries = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const
