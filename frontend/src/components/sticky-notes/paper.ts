/**
 * The physical properties of a sticky note: which pad it was torn off, and how
 * crookedly it got stuck to the wall. Both derive from the note's id, so a note
 * keeps the same colour and tilt across reloads and between the two of us.
 *
 * Paper stays paper in both themes — a pastel note glowing on a dark wall reads
 * better than a note that dims itself, and dark ink on pastel clears contrast
 * either way. That's why these are literal colours, not semantic tokens.
 */

export type PaperStock = {
  name: string;
  paper: string;
  /** A touch darker than the paper, for the title */
  ink: string;
  body: string;
};

const INK = "oklch(0.3 0.035 60)";
const BODY = "oklch(0.36 0.03 60)";

export const paperStocks: PaperStock[] = [
  { name: "butter", paper: "oklch(0.925 0.095 96)", ink: INK, body: BODY },
  { name: "mint", paper: "oklch(0.915 0.075 155)", ink: INK, body: BODY },
  { name: "sky", paper: "oklch(0.905 0.062 232)", ink: INK, body: BODY },
  { name: "blush", paper: "oklch(0.9 0.07 20)", ink: INK, body: BODY },
];

/** Cheap, stable string hash — the same id always lands on the same pad. */
function hash(id: string) {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) {
    value = (value * 31 + id.charCodeAt(index)) | 0;
  }
  return Math.abs(value);
}

export function paperFor(id: string) {
  const seed = hash(id);
  return {
    stock: paperStocks[seed % paperStocks.length],
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
