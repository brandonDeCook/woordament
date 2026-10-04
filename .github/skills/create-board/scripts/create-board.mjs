#!/usr/bin/env node
// Generates a Woordament board JSON file, ready to upload to the `boards` blob container.
// Zero dependencies. Requires Node 18+.
//
//   node create-board.mjs --theme football --words "touchdown,quarterback,punt,..."
//   node create-board.mjs --tiles "abcd efgh ijkl mnop"        (solve a hand-made board)
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const SIZE = 4;
const CELLS = SIZE * SIZE;
const MIN_WORD_LENGTH = 3;
const MAX_THEME_LENGTH = 14;
const DICTIONARY_URL =
  "https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(SCRIPT_DIR, "..", ".cache");

// Frequency-weighted fill letters (no "q": the client has no "Qu" tile).
const FILL_LETTERS = [
  ..."eeeeeeeeeeeeaaaaaaaaaiiiiiiiiioooooooonnnnnnrrrrrrttttttllllssssuuuuddddgggbbccmmppffhhvvwwyykjxz",
];

const LETTER_VALUES = Object.fromEntries(
  Object.entries({
    1: "aeioulnstr",
    2: "dg",
    3: "bcmp",
    4: "fhvwy",
    5: "k",
    8: "jx",
    10: "qz",
  }).flatMap(([value, letters]) => [...letters].map((l) => [l, Number(value)]))
);

const { values: args } = parseArgs({
  options: {
    theme: { type: "string" },
    words: { type: "string" },
    tiles: { type: "string" },
    out: { type: "string", default: "generated-boards" },
    id: { type: "string" },
    seed: { type: "string" },
    restarts: { type: "string", default: "6" },
    iterations: { type: "string", default: "3000" },
    "min-words": { type: "string", default: "75" },
    "theme-bonus": { type: "string", default: "2" },
    dictionary: { type: "string" },
    exclude: { type: "string" },
    force: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (args.help || (!args.words && !args.tiles)) {
  console.log(`Usage:
  node create-board.mjs --theme <name> --words "word1,word2,..." [options]
  node create-board.mjs --tiles "abcd efgh ijkl mnop" [options]

Options:
  --theme <name>        Theme label (max 14 chars), saved in the file and shown above the board in-game
  --words <list>        Comma/space separated theme words (letters only, 3-16 chars)
  --tiles <16 letters>  Skip the search and solve this exact board
  --out <dir>           Output folder (default: ./generated-boards)
  --id <guid>           Reuse an existing board id so the upload overwrites it
  --seed <n>            Make the search reproducible
  --restarts <n>        Search restarts (default 6)
  --iterations <n>      Steps per restart (default 3000)
  --min-words <n>       Minimum total words for a playable board (default 75)
  --theme-bonus <n>     Point multiplier for theme words (default 2)
  --dictionary <file>   Word list (one word per line); default: cached ENABLE list
  --exclude <list>      Words to remove from the board (e.g. offensive words)
  --force               Write the file even if the quality gate fails`);
  process.exit(args.help ? 0 : 1);
}

const toInt = (value, name) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`--${name} must be a non-negative number`);
  }
  return n;
};

const splitList = (value) =>
  (value ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = args.seed ? toInt(args.seed, "seed") : Math.floor(Math.random() * 2 ** 31);
const rng = mulberry32(seed);
const randInt = (n) => Math.floor(rng() * n);
const pick = (items) => items[randInt(items.length)];

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const NEIGHBORS = Array.from({ length: CELLS }, (_, cell) => {
  const x = cell % SIZE;
  const y = Math.floor(cell / SIZE);
  const result = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) {
        result.push(ny * SIZE + nx);
      }
    }
  }
  return result;
});

async function loadDictionary() {
  const file = args.dictionary ? resolve(args.dictionary) : join(CACHE_DIR, "enable1.txt");
  if (!existsSync(file)) {
    if (args.dictionary) {
      throw new Error(`Dictionary not found: ${file}`);
    }
    console.error(`Downloading word list (one time) from ${DICTIONARY_URL}`);
    const response = await fetch(DICTIONARY_URL);
    if (!response.ok) {
      throw new Error(`Dictionary download failed: HTTP ${response.status}`);
    }
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(file, await response.text());
  }
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => /^[a-z]+$/.test(w) && w.length >= MIN_WORD_LENGTH && w.length <= CELLS);
}

function buildTrie(words) {
  const root = {};
  for (const word of words) {
    let node = root;
    for (const char of word) {
      node = node[char] ??= {};
    }
    node.$ = true;
  }
  return root;
}

function solve(root, tiles) {
  const found = new Set();
  const used = new Uint8Array(CELLS);

  const walk = (cell, node, prefix) => {
    const next = node[tiles[cell]];
    if (!next) {
      return;
    }
    const word = prefix + tiles[cell];
    if (next.$) {
      found.add(word);
    }
    used[cell] = 1;
    for (const neighbor of NEIGHBORS[cell]) {
      if (!used[neighbor]) {
        walk(neighbor, next, word);
      }
    }
    used[cell] = 0;
  };

  for (let cell = 0; cell < CELLS; cell++) {
    walk(cell, root, "");
  }
  return found;
}

const countVowels = (tiles) => tiles.filter((t) => "aeiou".includes(t)).length;

function seedBoard(themeWords) {
  const grid = Array(CELLS).fill("");
  const order = themeWords
    .map((word) => ({ word, weight: word.length * (0.5 + rng()) }))
    .sort((a, b) => b.weight - a.weight)
    .map(({ word }) => word);

  const place = (word) => {
    const used = new Uint8Array(CELLS);
    const path = [];
    const step = (cell, index) => {
      if (used[cell] || (grid[cell] && grid[cell] !== word[index])) {
        return false;
      }
      used[cell] = 1;
      path.push(cell);
      if (index === word.length - 1) {
        return true;
      }
      for (const neighbor of shuffle([...NEIGHBORS[cell]])) {
        if (step(neighbor, index + 1)) {
          return true;
        }
      }
      used[cell] = 0;
      path.pop();
      return false;
    };
    for (const start of shuffle([...Array(CELLS).keys()])) {
      if (step(start, 0)) {
        return path;
      }
    }
    return null;
  };

  for (const word of order) {
    place(word)?.forEach((cell, i) => {
      grid[cell] = word[i];
    });
  }
  return grid.map((letter) => letter || pick(FILL_LETTERS));
}

function search({ root, themeWords, minWords }) {
  const themeLetters = [...themeWords.join("")];
  const letterPool = themeLetters.length ? themeLetters : FILL_LETTERS;

  const evaluate = (tiles) => {
    const found = solve(root, tiles);
    const themeFound = themeWords.filter((w) => found.has(w));
    const vowels = countVowels(tiles);
    const themeLength = themeFound.reduce((sum, w) => sum + w.length, 0);
    let score = themeLength * 25 + Math.min(found.size, 200);
    if (found.size < minWords) {
      score -= (minWords - found.size) * 4;
    }
    if (vowels < 4 || vowels > 7) {
      score -= 150;
    }
    return { tiles, score, found, themeFound, vowels };
  };

  const restarts = toInt(args.restarts, "restarts");
  const iterations = toInt(args.iterations, "iterations");
  let best = null;

  for (let restart = 1; restart <= restarts; restart++) {
    let current = evaluate(seedBoard(themeWords));
    best ??= current;
    for (let step = 0; step < iterations; step++) {
      const temperature = 20 * (1 - step / iterations) + 0.5;
      const candidate = [...current.tiles];
      if (rng() < 0.65) {
        candidate[randInt(CELLS)] = rng() < 0.5 ? pick(letterPool) : pick(FILL_LETTERS);
      } else {
        const a = randInt(CELLS);
        const b = randInt(CELLS);
        [candidate[a], candidate[b]] = [candidate[b], candidate[a]];
      }
      const next = evaluate(candidate);
      if (next.score >= current.score || rng() < Math.exp((next.score - current.score) / temperature)) {
        current = next;
      }
      if (current.score > best.score) {
        best = current;
      }
    }
    console.error(
      `restart ${restart}/${restarts}: best so far ${best.themeFound.length}/${themeWords.length} theme words, ${best.found.size} words`
    );
  }
  return best;
}

function parseTiles(value) {
  const letters = [...value.toLowerCase().replace(/[^a-z]/g, "")];
  if (letters.length !== CELLS) {
    throw new Error(`--tiles needs exactly ${CELLS} letters, got ${letters.length}`);
  }
  return letters;
}

const scoreWord = (word, isTheme, bonus) => {
  const letters = [...word].reduce((sum, l) => sum + LETTER_VALUES[l], 0);
  const lengthBonus = word.length >= 5 ? (word.length - 4) * 5 : 0;
  return (letters + lengthBonus) * (isTheme ? bonus : 1);
};

function verifyBoardFile(file) {
  const board = JSON.parse(readFileSync(file, "utf8"));
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!Array.isArray(board.tiles) || board.tiles.length !== SIZE || board.tiles.some((row) => row.length !== SIZE)) {
    throw new Error("Verification failed: tiles must be 4x4");
  }
  const tiles = board.tiles.flat();
  if (!tiles.every((t) => /^[a-z]$/.test(t))) {
    throw new Error("Verification failed: every tile must be a single lowercase letter");
  }
  if (!guid.test(board.id)) {
    throw new Error("Verification failed: id must be a GUID");
  }
  if (board.theme !== undefined && (typeof board.theme !== "string" || !board.theme || board.theme.length > MAX_THEME_LENGTH)) {
    throw new Error(`Verification failed: theme must be a non-empty string of at most ${MAX_THEME_LENGTH} characters`);
  }
  const words = Object.entries(board.wordList);
  if (!words.length || !words.every(([, points]) => Number.isFinite(points) && points > 0)) {
    throw new Error("Verification failed: wordList must have positive point values");
  }
  const traceable = solve(buildTrie(words.map(([w]) => w)), tiles);
  const missing = words.filter(([w]) => !traceable.has(w));
  if (missing.length) {
    throw new Error(`Verification failed: ${missing.length} words cannot be traced on the board`);
  }
}

async function main() {
  const exclude = new Set(splitList(args.exclude));
  const themeBonus = toInt(args["theme-bonus"], "theme-bonus");
  const minWords = toInt(args["min-words"], "min-words");
  if (args.theme && args.theme.trim().length > MAX_THEME_LENGTH) {
    throw new Error(`--theme must be at most ${MAX_THEME_LENGTH} characters (it is shown above the board)`);
  }
  if (args.id && !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(args.id)) {
    throw new Error("--id must be a GUID");
  }

  const dictionaryWords = (await loadDictionary()).filter((w) => !exclude.has(w));
  const dictionarySet = new Set(dictionaryWords);

  const rejected = [];
  const themeWords = [];
  for (const word of new Set(splitList(args.words))) {
    if (word.length < MIN_WORD_LENGTH || word.length > CELLS || exclude.has(word)) {
      rejected.push(word);
    } else {
      themeWords.push(word);
    }
  }
  const customWords = themeWords.filter((w) => !dictionarySet.has(w));
  const root = buildTrie([...new Set([...dictionaryWords, ...themeWords])]);

  let result;
  if (args.tiles) {
    const tiles = parseTiles(args.tiles);
    const found = solve(root, tiles);
    result = {
      tiles,
      found,
      themeFound: themeWords.filter((w) => found.has(w)),
      vowels: countVowels(tiles),
    };
  } else {
    result = search({ root, themeWords, minWords });
  }

  const gatePassed = result.found.size >= minWords && result.vowels >= 4 && result.vowels <= 7;
  const themeSet = new Set(themeWords);
  const wordList = Object.fromEntries(
    [...result.found]
      .sort()
      .map((word) => [word, scoreWord(word, themeSet.has(word), themeBonus)])
  );

  const rows = Array.from({ length: SIZE }, (_, y) => result.tiles.slice(y * SIZE, y * SIZE + SIZE));
  const id = args.id ?? randomUUID();

  console.log(`\nTheme: ${args.theme ?? "custom"}   Seed: ${seed}`);
  console.log(rows.map((row) => "  " + row.join(" ").toUpperCase()).join("\n"));
  console.log(
    `\nWords: ${result.found.size} (min ${minWords})   Vowels: ${result.vowels}   Quality gate: ${gatePassed ? "PASS" : "FAIL"}`
  );

  if (themeWords.length) {
    const missed = themeWords.filter((w) => !result.found.has(w));
    console.log(`Theme words placed (${result.themeFound.length}/${themeWords.length}): ${result.themeFound.join(", ") || "none"}`);
    if (missed.length) {
      console.log(`Theme words NOT placed: ${missed.join(", ")}`);
    }
    if (customWords.length) {
      console.log(`Theme words not in the dictionary (valid on this board only): ${customWords.join(", ")}`);
    }
  }
  if (rejected.length) {
    console.log(`Ignored theme words (length outside ${MIN_WORD_LENGTH}-${CELLS} or excluded): ${rejected.join(", ")}`);
  }
  const longest = [...result.found].sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 10);
  console.log(`Longest words: ${longest.join(", ")}`);

  if (!gatePassed && !args.force) {
    console.error(
      "\nNo file written: the board failed the quality gate. Use fewer or shorter theme words, " +
        "re-run with a different --seed, or pass --force."
    );
    process.exit(2);
  }

  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${id}.json`);
  const theme = args.theme?.replace(/\s+/g, " ").trim();
  writeFileSync(file, JSON.stringify({ wordList, tiles: rows, id, ...(theme ? { theme } : {}) }));
  verifyBoardFile(file);

  console.log(`\nFile: ${file}  (verified)`);
  console.log("\nUpload (upsert) to blob storage:");
  console.log(
    `  az storage blob upload --account-name <storage-account> --container-name boards --name ${id}.json --file "${file}" --overwrite --auth-mode login`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
