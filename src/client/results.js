const sameId = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

const normalizeWords = (words) =>
  (words ?? []).map((word) => String(word).trim().toLowerCase()).filter(Boolean);

// Builds the end-of-game word summary. `localWords` covers the gap before the
// server has stored this player's words.
export function buildResults({ players, myId, localWords, wordList }) {
  const points = (word) => wordList?.[word] ?? 0;
  const byPoints = (a, b) => points(b) - points(a) || a.localeCompare(b);

  const me = (players ?? []).find((player) => sameId(player.id, myId));
  const mine = new Set([...normalizeWords(me?.words), ...normalizeWords(localWords)]);

  const group = new Set(mine);
  const finders = new Map([...mine].map((word) => [word, me?.name ?? null]));
  for (const player of players ?? []) {
    for (const word of normalizeWords(player.words)) {
      group.add(word);
      if (!finders.has(word)) {
        finders.set(word, player.name);
      }
    }
  }

  const groupWords = [...group].sort(byPoints);
  const best = groupWords.length
    ? { word: groupWords[0], points: points(groupWords[0]), finder: finders.get(groupWords[0]) }
    : null;

  return { myWords: [...mine].sort(byPoints), groupWords, best, points };
}
