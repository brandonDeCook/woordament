---
name: create-board
description: Create a themed Woordament board (4x4 tiles plus word list with points) as a JSON file ready to upload to the `boards` blob container. WHEN: "create a board", "new board", "themed board", "make a football board", "generate a board about <theme>", "board for <theme>".
---

# Create Board

Turns a theme ("football", "pirates", "baking") into a board file. **You** (the AI) pick the theme words. **The script** places them on the 4x4 grid, solves the whole board against a real dictionary, scores every word, and writes the file. Do not upload anything. The user uploads the file manually.

## Workflow

1. **Get the theme.** If it's vague, ask once. Optional extras: tone (kid-friendly by default), words to avoid.
2. **Brainstorm 20-30 theme words.** Rules:
   - Lowercase letters only, 3-16 characters, single words (no spaces, hyphens, digits, apostrophes).
   - Real, family-friendly words. No profanity, slurs, or trademarked names.
   - Mix lengths: a few long "hero" words (6-9 letters), mostly 3-6 letter words. Many long words won't all fit on 16 tiles. That's expected, so list more than you need.
   - Prefer words with plenty of vowels and common letters; avoid "q", and don't rely on "z/x/j" heavy words.
   - Proper nouns and slang are allowed. They become valid on this board only (the summary lists them).
3. **Run the script** from the repo root:

   ```powershell
   node .github/skills/create-board/scripts/create-board.mjs --theme "<theme>" --words "<comma,separated,words>" --out generated-boards
   ```

   First run downloads the ENABLE word list (public domain) into `.github/skills/create-board/.cache/`. A run takes about 5-15 seconds.
4. **Review the summary** and iterate (max 3 attempts):
   - Quality gate must say `PASS` (>= 75 words, 4-7 vowels). On `FAIL` no file is written. Use fewer/shorter theme words or change `--seed`.
   - Aim for at least 5 theme words placed, including at least one 6+ letter word. If most hero words are missed, swap them for shorter ones or rerun with another `--seed`.
   - Check the "Longest words" list and the theme words for anything inappropriate. Remove it with `--exclude "word1,word2"` and rerun.
5. **Report to the user:** the grid, theme words placed and missed, total words, the file path, and the upload command printed by the script. Mention the board id.

## Other modes

- Solve a hand-made board: `--tiles "abcd efgh ijkl mnop"` (add `--words` to mark theme words for the bonus).
- Replace an existing board: pass its GUID with `--id <guid>`. Uploading with `--overwrite` upserts it.
- Reproduce a result: `--seed <n>` (the seed is printed in every summary).
- Use a different dictionary: `--dictionary <file>` (one word per line).
- Tune the search: `--restarts`, `--iterations`, `--min-words`, `--theme-bonus` (default 2, points multiplier for theme words).

## Output contract

The file is `<id>.json`, compact JSON, matching the API's `Board` record (camelCase):

```json
{ "wordList": { "word": 7 }, "tiles": [["a","b","c","d"], ...4 rows], "id": "<guid>" }
```

- `tiles`: 4x4, one lowercase letter per tile (the client uppercases for display).
- `wordList`: lowercase word to points (letter values plus a length bonus for 5+ letters, theme words multiplied).
- `id`: GUID. Blob name is `<id>.json` in the `boards` container, the same convention as `src/backend/src/board-generator`.
- The script re-reads the file and checks the shape and that every word is traceable before reporting success.

## Upload (manual)

```powershell
az storage blob upload --account-name <storage-account> --container-name boards --name <id>.json --file "<path>" --overwrite --auth-mode login
```

Azure Storage Explorer also works. The API caches the board list for 1 hour, so a new board can take up to an hour to appear in random selection.

## Limits

- No "Qu" tile: the client renders one letter per tile.
- Theme words are only guaranteed when the summary says they were placed.
- Offensive words in the dictionary are only removed via `--exclude`. Review the longest-word list before publishing.
