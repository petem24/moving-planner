/**
 * Design system contrast audit.
 *
 * Parses the OKLCH tokens out of src/index.css, converts them to sRGB and
 * checks every foreground/background pairing the system promises against
 * WCAG AA (4.5:1). Run with `pnpm check:contrast`; exits non-zero on a fail.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "index.css"), "utf8");

// Split :root (light) vs .dark blocks and collect --var: oklch(...) declarations.
function collect(scopeRegex) {
  const vars = {};
  for (const block of css.match(scopeRegex) ?? []) {
    for (const [, name, val] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      vars[name] = val.trim();
    }
  }
  return vars;
}
const light = collect(/:root\s*\{[^}]*\}/g);
const dark = { ...light, ...collect(/\.dark\s*\{[^}]*\}/g) };

function resolve(vars, value, depth = 0) {
  if (depth > 10) return null;
  const v = value.trim();
  const ref = v.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (ref) return vars[ref[1]] ? resolve(vars, vars[ref[1]], depth + 1) : null;
  return v;
}

function oklchToSrgb(str) {
  const m = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (!m) return null;
  const [L, C, hDeg] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, mm = m_ ** 3, s = s_ ** 3;
  const lr =  4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s;
  return [lr, lg, lb].map((c) => Math.min(1, Math.max(0, c)));
}

const relLum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b; // already linear
function ratio(vars, aName, bName) {
  const A = oklchToSrgb(resolve(vars, vars[aName] ?? "") ?? "");
  const B = oklchToSrgb(resolve(vars, vars[bName] ?? "") ?? "");
  if (!A || !B) return null;
  const [hi, lo] = [relLum(A), relLum(B)].sort((x, y) => y - x);
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}

const pairs = [
  ["--foreground", "--background"],
  ["--muted-foreground", "--background"],
  ["--card-foreground", "--card"],
  ["--primary-foreground", "--primary"],
  ["--secondary-foreground", "--secondary"],
  ["--accent-foreground", "--accent"],
  ["--destructive-foreground", "--destructive"],
  ["--success-foreground", "--success"],
  ["--warning-foreground", "--warning"],
  ["--info-foreground", "--info"],
  ["--keep-strong", "--keep-subtle"],
  ["--ship-strong", "--ship-subtle"],
  ["--sell-strong", "--sell-subtle"],
  ["--donate-strong", "--donate-subtle"],
  ["--bin-strong", "--bin-subtle"],
];

const AA = 4.5;
const flag = (r) => (r === null ? "  ?  " : r >= AA ? "AA   " : r >= 3 ? "AA-lg" : "FAIL ");

let failures = 0;
console.log("pair".padEnd(42), "light".padEnd(13), "dark");
for (const [a, b] of pairs) {
  const L = ratio(light, a, b);
  const D = ratio(dark, a, b);
  if (L === null || D === null || L < AA || D < AA) failures++;
  console.log(
    `${a} on ${b}`.padEnd(42),
    `${String(L).padEnd(6)} ${flag(L)}`.padEnd(13),
    `${String(D).padEnd(6)} ${flag(D)}`
  );
}

if (failures > 0) {
  console.error(`\n${failures} pairing(s) below WCAG AA (${AA}:1).`);
  process.exit(1);
}
console.log("\nAll pairings pass WCAG AA.");
