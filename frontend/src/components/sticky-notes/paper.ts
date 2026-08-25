/**
 * The physical properties of a sticky note: which pad it was torn off, and how
 * crookedly it got stuck to the wall. A chosen colour is saved on the note;
 * legacy notes without one still get a stable colour from their id.
 *
 * Paper stays paper in both themes — a pastel note glowing on a dark wall reads
 * better than a note that dims itself, and dark ink on pastel clears contrast
 * either way. That's why these are literal colours, not semantic tokens.
 */

export type PaperStock = {
  name: PaperColor;
  label: string;
  paper: string;
  /** A touch darker than the paper, for the title */
  ink: string;
  body: string;
};

export const PAPER_COLORS = ["butter", "mint", "sky", "blush", "lavender"] as const;

export type PaperColor = (typeof PAPER_COLORS)[number];

export const DEFAULT_PAPER_COLOR: PaperColor = "butter";

const INK = "oklch(0.3 0.035 60)";
const BODY = "oklch(0.36 0.03 60)";

export const paperStocks: PaperStock[] = [
  { name: "butter", label: "Butter", paper: "oklch(0.925 0.095 96)", ink: INK, body: BODY },
  { name: "mint", label: "Mint", paper: "oklch(0.915 0.075 155)", ink: INK, body: BODY },
  { name: "sky", label: "Sky", paper: "oklch(0.905 0.062 232)", ink: INK, body: BODY },
  { name: "blush", label: "Blush", paper: "oklch(0.9 0.07 20)", ink: INK, body: BODY },
  { name: "lavender", label: "Lavender", paper: "oklch(0.9 0.065 305)", ink: INK, body: BODY },
];

// Keep the old four-colour assignment stable for notes created before colour
// selection was saved on the note.
const legacyPaperStocks = paperStocks.slice(0, 4);

/** Cheap, stable string hash — the same id always lands on the same pad. */
function hash(id: string) {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) {
    value = (value * 31 + id.charCodeAt(index)) | 0;
  }
  return Math.abs(value);
}

export function paperFor(id: string, color?: PaperColor) {
  const seed = hash(id);
  return {
    stock: color
      ? paperStocks.find((paper) => paper.name === color)!
      : legacyPaperStocks[seed % legacyPaperStocks.length],
    /** −2.5° … 2.5°, so a wall of notes never looks machine-aligned */
    tilt: ((seed % 11) - 5) * 0.5,
  };
}

/** Shared inline style for anything made of paper. */
export function paperStyle(stock: PaperStock, tilt = 0) {
  return {
    background: stock.paper,
    color: stock.body,
    "--tilt": `${tilt}deg`,
  } as React.CSSProperties;
}
