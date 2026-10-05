import { Scene } from "phaser";
import Colors, { API_BASE_URL } from "../constants";
import GameService from "../services/gameService";
import Utils from "../utils";

const GAME_DURATION_MS = 90000;
const ROTATE_TWEEN_MS = 200;
const MAX_PATHS = 64;
const STREAK_REQUIRED_WORDS = 3;
const STREAK_WINDOW_MS = 4000;
const BONUS_MULTIPLIER = 1.3;
const BONUS_DURATION_MS = 8000;
const HINT_LIMIT = 2;
const HINT_DISPLAY_MS = 2000;

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.game = data.game;
    this.player = data.player;
  }

  preload() {
    this.loadedGrid = this.game.board.tiles;
    this.loadedWordList = this.game.board.wordList;
  }

  create() {
    const isMobile =
      this.sys.game.device.os.android ||
      this.sys.game.device.os.iOS ||
      this.sys.game.device.os.iPad ||
      this.sys.game.device.os.iPhone;

    const width = this.sys.canvas.width;
    const height = this.sys.canvas.height;
    this.gridSize = 4;

    const uiMargin = 80;
    const headerHeight = isMobile ? 28 : 40;
    const footerHeight = headerHeight;
    const usableWidth = width - uiMargin;
    const usableHeight = height - uiMargin;
    const cellBuffer = 5;
    const maxCellSizeHoriz =
      (usableWidth - cellBuffer * (this.gridSize - 1)) / this.gridSize;
    const maxCellSizeVert =
      (usableHeight - cellBuffer * (this.gridSize - 1)) / this.gridSize;

    const cellSize = Math.min(maxCellSizeHoriz, maxCellSizeVert);

    this.grid = [];
    this.correctSelectedWords = [];
    this.selectedContainers = [];
    this.selectedText = null;
    this.isSelecting = false;
    this.prevSelectionCoordinates = [];
    this.timerText = null;
    this.rotation = 0;
    this.finished = false;
    this.submission = null;
    this.lastDisplayedSeconds = null;
    this.endTime = Date.now() + GAME_DURATION_MS;
    this.score = 0;
    this.correctWordStreak = 0;
    this.lastCorrectWordAt = 0;
    this.multiplierExpiresAt = 0;
    this.hintsRemaining = HINT_LIMIT;
    this.hintedWords = new Set();
    this.hintTimeout = null;

    const totalGridWidth =
      this.gridSize * cellSize + cellBuffer * (this.gridSize - 1);
    const totalGridHeight =
      this.gridSize * cellSize + cellBuffer * (this.gridSize - 1);

    const startX = (width - totalGridWidth) / 2;
    const framePadding = isMobile ? 8 : 12;
    const frameWidth = totalGridWidth + framePadding * 2;
    const frameHeight =
      totalGridHeight + headerHeight + footerHeight;
    const frameX = (width - frameWidth) / 2;
    const frameY = (height - frameHeight) / 2;
    const startY = frameY + headerHeight;
    this.layout = { startX, startY, cellSize, cellBuffer };

    this.add
      .rectangle(frameX, frameY, frameWidth, frameHeight, Colors.WHITE.hex)
      .setOrigin(0);
    this.add
      .rectangle(
        startX - 4,
        startY - 4,
        totalGridWidth + 8,
        totalGridHeight + 8,
        Colors.BLACK.hex
      )
      .setOrigin(0);

    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const letter = this.loadedGrid[x][y].toUpperCase();

        const position = this.getCellPosition(x, y);
        const container = this.add.container(position.x, position.y);

        const box = this.add.rectangle(0, 0, cellSize, cellSize, 0xfcfcfc);
        box.setStrokeStyle(2, 0x000000);
        box.setOrigin(0);
        container.add(box);

        const circleRadius = cellSize / 2 - 8;
        const circle = this.add.circle(
          cellSize / 2,
          cellSize / 2,
          circleRadius,
          Colors.WHITE.hex
        );
        circle.setAlpha(0.01);
        circle.setInteractive();
        container.add(circle);

        const text = this.add.text(cellSize / 2, cellSize / 2, letter, {
          fontSize: isMobile ? Utils.snapFontSize(cellSize / 2) : "40px",
          fontFamily: "standard",
          fill: Colors.BLACK.anchor,
        });
        text.setOrigin(0.5);
        container.add(text);

        container.setSize(cellSize, cellSize);
        container.selected = false;
        container.id = x.toString() + y.toString();
        container.letter = letter;

        circle.on("pointerover", () =>
          this.selectBox(container, text, false, x, y)
        );
        circle.on("pointerdown", () =>
          this.selectBox(container, text, true, x, y)
        );

        this.grid[y][x] = { container, text, box };
      }
    }

    const hudFontSize = isMobile ? "8px" : "16px";
    const headerCenterY = frameY + headerHeight / 2;
    const footerCenterY = frameY + headerHeight + totalGridHeight + footerHeight / 2;
    const hudStyle = {
      fontSize: hudFontSize,
      fontFamily: "standard",
      fill: Colors.BLACK.anchor,
    };

    this.timerText = this.add
      .text(frameX + framePadding, headerCenterY, "Time: 01:30", hudStyle)
      .setOrigin(0, 0.5);

    this.selectedText = this.add
      .text(frameX + framePadding, footerCenterY, "Selected: ", hudStyle)
      .setOrigin(0, 0.5);

    this.scoreText = this.add
      .text(frameX + frameWidth - framePadding, footerCenterY, "Score: 0", hudStyle)
      .setOrigin(1, 0.5);
    this.selectedTextLabel = "Selected: ";

    this.hintButton = this.add
      .text(frameX + frameWidth / 2, footerCenterY, "Hint: 2", hudStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.hintButton.on("pointerover", () => {
      if (this.hintsRemaining > 0) {
        this.hintButton.setStyle({ fill: Colors.ORANGE.anchor });
      }
    });
    this.hintButton.on("pointerout", () =>
      this.hintButton.setStyle({ fill: Colors.BLACK.anchor })
    );
    this.hintButton.on("pointerdown", () => this.useHint());

    this.rotateButton = this.add
      .text(frameX + frameWidth - framePadding, headerCenterY, "Rotate", hudStyle)
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    this.rotateButton.on("pointerover", () =>
      this.rotateButton.setStyle({ fill: Colors.ORANGE.anchor })
    );
    this.rotateButton.on("pointerout", () =>
      this.rotateButton.setStyle({ fill: Colors.BLACK.anchor })
    );
    this.rotateButton.on("pointerdown", () => this.rotateBoard(1));

    const theme = Utils.normalizeName(this.game.board.theme);
    if (theme) {
      this.add
        .text(
          frameX + frameWidth / 2,
          headerCenterY - (isMobile ? 5 : 8),
          theme.slice(0, 14).toUpperCase(),
          {
            ...hudStyle,
            fill: Colors.ORANGE.anchor,
          }
        )
        .setOrigin(0.5);
    }

    this.bonusText = this.add
      .text(
        frameX + frameWidth / 2,
        theme
          ? headerCenterY + (isMobile ? 6 : 12)
          : headerCenterY,
        "",
        {
          ...hudStyle,
          fontSize: "8px",
          fill: Colors.ORANGE.anchor,
        }
      )
      .setOrigin(0.5);

    this.input.on("pointerup", this.endSelection, this);
    this.input.keyboard.on("keydown", this.handleKeyDown, this);

    // Wall-clock watchdog: Phaser's loop pauses when the tab is hidden, so the
    // final score is submitted from a native timer to keep multiplayer moving.
    this.deadlineTimeout = window.setTimeout(
      () => this.submitFinalScore(),
      GAME_DURATION_MS
    );
    this.events.once("shutdown", () => {
      window.clearTimeout(this.deadlineTimeout);
      this.clearHintTimeout();
    });
  }

  update() {
    this.scoreText.setText("Score: " + this.score);
    const selectedWord = this.getSelectedText();
    this.selectedText.setText(this.selectedTextLabel + selectedWord);

    const maxSelectedWidth =
      Math.min(
        this.scoreText.x - this.scoreText.width,
        this.hintButton.x - this.hintButton.width / 2
      ) -
      this.selectedText.x -
      this.layout.cellBuffer;
    let displayedWord = selectedWord;
    while (this.selectedText.width > maxSelectedWidth && displayedWord.length > 0) {
      displayedWord = displayedWord.slice(0, -1);
      this.selectedText.setText(
        this.selectedTextLabel + displayedWord
      );
    }
    this.updateBonusText();
    this.updateTimer();
  }

  isExpired() {
    return Date.now() >= this.endTime;
  }

  getSelectedText() {
    return this.selectedContainers
      .map((selectedContainer) => selectedContainer.container.letter)
      .join("");
  }

  getCellPosition(x, y) {
    const { startX, startY, cellSize, cellBuffer } = this.layout;
    const last = this.gridSize - 1;
    const [column, row] = [
      [x, y],
      [last - y, x],
      [last - x, last - y],
      [y, last - x],
    ][this.rotation];
    const step = cellSize + cellBuffer;

    return { x: startX + column * step, y: startY + row * step };
  }

  rotateBoard(direction) {
    if (this.finished || this.isSelecting) {
      return;
    }

    this.rotation = (this.rotation + direction + 4) % 4;
    this.grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        const { x: targetX, y: targetY } = this.getCellPosition(x, y);
        this.tweens.killTweensOf(cell.container);
        this.tweens.add({
          targets: cell.container,
          x: targetX,
          y: targetY,
          duration: ROTATE_TWEEN_MS,
          ease: "Sine.easeInOut",
        });
      })
    );
  }

  handleKeyDown(event) {
    if (
      this.finished ||
      this.isExpired() ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        this.rotateBoard(-1);
        break;
      case "ArrowRight":
        this.rotateBoard(1);
        break;
      case "Tab":
        event.preventDefault();
        if (!this.isSelecting) {
          this.cyclePath(event.shiftKey ? -1 : 1);
        }
        break;
      case "Backspace":
        if (!this.isSelecting) {
          this.removeLastTile();
        }
        break;
      case "Escape":
        if (!this.isSelecting) {
          this.clearSelection();
        }
        break;
      case "Enter":
        if (!this.isSelecting && !event.repeat) {
          this.submitSelection();
        }
        break;
      default:
        if (!this.isSelecting && !event.repeat && /^[a-z]$/i.test(event.key)) {
          this.typeLetter(event.key.toUpperCase());
        }
    }
  }

  typeLetter(letter) {
    if (this.selectedContainers.length === 0) {
      this.clearHintTimeout();
      this.resetGrid();
    }

    const path = this.findPaths(this.getSelectedText() + letter, 1, true)[0];
    if (!path) {
      this.sound.play("wordFail");
      return;
    }

    this.applyPath(path);
    this.sound.play("tileSelect");
  }

  applyPath(path) {
    this.resetGrid();
    this.selectedContainers = [];
    this.prevSelectionCoordinates = [];
    path.forEach(([x, y]) => this.addToSelection(x, y));
  }

  useHint() {
    if (
      this.finished ||
      this.isExpired() ||
      this.isSelecting ||
      this.hintsRemaining <= 0
    ) {
      return;
    }

    const hint = this.findHint();
    if (!hint) {
      return;
    }

    this.hintsRemaining--;
    this.hintedWords.add(hint.word);
    this.updateHintButton();
    this.clearHintTimeout();
    this.resetGrid();
    this.selectedContainers = [];
    this.prevSelectionCoordinates = [];

    hint.path.forEach(([x, y]) => {
      const { text, box } = this.grid[y][x];
      text.setColor(Colors.WHITE.anchor);
      box.setFillStyle(Colors.ORANGE.hex);
    });

    this.hintTimeout = window.setTimeout(() => {
      this.resetGrid();
      this.hintTimeout = null;
    }, HINT_DISPLAY_MS);
  }

  clearHintTimeout() {
    window.clearTimeout(this.hintTimeout);
    this.hintTimeout = null;
  }

  findHint() {
    const words = Object.keys(this.loadedWordList)
      .filter((word) => {
        const normalizedWord = word.toLowerCase();
        return (
          !this.correctSelectedWords.includes(word.toUpperCase()) &&
          !this.hintedWords.has(normalizedWord)
        );
      })
      .sort((first, second) => second.length - first.length);

    for (const word of words) {
      const path = this.findPaths(word.toUpperCase(), 1, false)[0];
      if (path) {
        return { word: word.toLowerCase(), path };
      }
    }

    return null;
  }

  updateHintButton() {
    this.hintButton.setText(`Hint: ${this.hintsRemaining}`);
    this.hintButton.setAlpha(this.hintsRemaining > 0 ? 1 : 0.45);
  }

  updateBonusText() {
    if (this.multiplierExpiresAt && Date.now() >= this.multiplierExpiresAt) {
      this.multiplierExpiresAt = 0;
    }

    this.bonusText.setText(
      this.multiplierExpiresAt > Date.now() ? "BONUS 30%" : ""
    );
  }

  resetWordStreak() {
    this.correctWordStreak = 0;
    this.lastCorrectWordAt = 0;
  }

  getWordScore(baseScore) {
    const now = Date.now();
    this.correctWordStreak =
      now - this.lastCorrectWordAt <= STREAK_WINDOW_MS
        ? this.correctWordStreak + 1
        : 1;
    this.lastCorrectWordAt = now;

    if (this.correctWordStreak === STREAK_REQUIRED_WORDS) {
      this.multiplierExpiresAt = now + BONUS_DURATION_MS;
    }

    return Math.round(
      baseScore *
        (this.multiplierExpiresAt > now ? BONUS_MULTIPLIER : 1)
    );
  }

  // Letters can repeat on the board, so Tab steps through every distinct way
  // of tracing the typed word.
  cyclePath(direction) {
    const word = this.getSelectedText();
    if (!word) {
      return;
    }

    const paths = this.findPaths(word, MAX_PATHS, false);
    if (paths.length < 2) {
      return;
    }

    const current = this.selectedContainers
      .map(({ x, y }) => `${x},${y}`)
      .join("|");
    const index = paths.findIndex(
      (path) => path.map(([x, y]) => `${x},${y}`).join("|") === current
    );
    const next = (index + direction + paths.length) % paths.length;

    this.applyPath(paths[next]);
    this.sound.play("tileSelect");
  }

  // Finds up to `limit` paths of adjacent, unused tiles spelling the word. With
  // `preferSelection`, the current selection is tried first so the highlighted
  // path stays stable while typing.
  findPaths(word, limit, preferSelection) {
    const preferred = preferSelection
      ? this.selectedContainers.map(({ x, y }) => [x, y])
      : [];
    const paths = [];
    const path = [];
    const used = new Set();

    const order = (cells, preferredCell) =>
      preferredCell
        ? [
            ...cells.filter(
              ([x, y]) => x === preferredCell[0] && y === preferredCell[1]
            ),
            ...cells.filter(
              ([x, y]) => x !== preferredCell[0] || y !== preferredCell[1]
            ),
          ]
        : cells;

    const search = (index, candidates) => {
      for (const [x, y] of candidates) {
        const key = `${x},${y}`;
        if (
          x < 0 ||
          y < 0 ||
          x >= this.gridSize ||
          y >= this.gridSize ||
          used.has(key) ||
          this.grid[y][x].container.letter !== word[index]
        ) {
          continue;
        }

        used.add(key);
        path.push([x, y]);
        if (index === word.length - 1) {
          paths.push(path.map((cell) => [...cell]));
        } else {
          const neighbors = [];
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx !== 0 || dy !== 0) {
                neighbors.push([x + dx, y + dy]);
              }
            }
          }
          search(index + 1, order(neighbors, preferred[index + 1]));
        }

        path.pop();
        used.delete(key);
        if (paths.length >= limit) {
          return;
        }
      }
    };

    const allCells = [];
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        allCells.push([x, y]);
      }
    }

    search(0, order(allCells, preferred[0]));
    return paths;
  }

  removeLastTile() {
    const last = this.selectedContainers.pop();
    if (!last) {
      return;
    }

    last.container.selected = false;
    last.text.setColor(Colors.BLACK.anchor);
    last.box.setFillStyle(Colors.WHITE.hex);

    const previous = this.selectedContainers[this.selectedContainers.length - 1];
    this.prevSelectionCoordinates = previous ? [previous.x, previous.y] : [];
  }

  clearSelection() {
    this.clearHintTimeout();
    this.resetGrid();
    this.selectedContainers = [];
    this.prevSelectionCoordinates = [];
  }

  resetGrid() {
    this.grid.forEach((row) =>
      row.forEach((cell) => {
        cell.container.selected = false;
        cell.text.setColor(Colors.BLACK.anchor);
        cell.box.setFillStyle(Colors.WHITE.hex);
      })
    );
  }

  addToSelection(x, y) {
    const { container, text, box } = this.grid[y][x];
    text.setColor(Colors.WHITE.anchor);
    box.setFillStyle(Colors.BLUE.hex);
    container.selected = true;
    this.selectedContainers.push({ container, text, box, x, y });
    this.prevSelectionCoordinates = [x, y];
  }

  endSelection() {
    if (!this.isSelecting) {
      return;
    }

    this.isSelecting = false;
    this.submitSelection();
  }

  submitSelection() {
    if (this.selectedContainers.length === 0 || this.isExpired()) {
      return;
    }

    const selectedWord = this.getSelectedText();
    if (
      Object.prototype.hasOwnProperty.call(
        this.loadedWordList,
        selectedWord.toLowerCase()
      ) &&
      !this.correctSelectedWords.includes(selectedWord)
    ) {
      this.selectedContainers.forEach((container) => {
        container.text.setColor(Colors.BLACK.anchor);
        container.box.setFillStyle(Colors.GREEN.hex);
      });
      this.correctSelectedWords.push(selectedWord);
      this.score += this.getWordScore(
        this.loadedWordList[selectedWord.toLowerCase()]
      );
      this.sound.play("wordSuccess");
    } else if (this.correctSelectedWords.includes(selectedWord)) {
      this.selectedContainers.forEach((container) => {
        container.text.setColor(Colors.WHITE.anchor);
        container.box.setFillStyle(Colors.ORANGE.hex);
      });
      this.resetWordStreak();
      this.sound.play("wordFail");
    } else {
      this.selectedContainers.forEach((container) => {
        container.text.setColor(Colors.WHITE.anchor);
        container.box.setFillStyle(Colors.RED.hex);
      });
      this.resetWordStreak();
      this.sound.play("wordFail");
    }

    this.prevSelectionCoordinates = [];
    this.selectedContainers = [];
  }

  selectBox(container, text, isStartSelecting, x, y) {
    if (this.finished || this.isExpired()) {
      return;
    }

    if (isStartSelecting) {
      this.clearHintTimeout();
      this.isSelecting = true;
      this.selectedContainers = [];
      this.prevSelectionCoordinates = [];
      this.resetGrid();
    }

    if (this.isSelecting && !container.selected) {
      let isValidSelection = true;
      if (this.prevSelectionCoordinates.length == 2) {
        const [prevX, prevY] = this.prevSelectionCoordinates;

        const directions = [
          [prevX + 1, prevY], // right
          [prevX - 1, prevY], // left
          [prevX, prevY - 1], // up
          [prevX, prevY + 1], // down
          [prevX + 1, prevY - 1], // right up
          [prevX - 1, prevY - 1], // left up
          [prevX + 1, prevY + 1], // right down
          [prevX - 1, prevY + 1], // left down
        ];

        isValidSelection = directions.some(
          ([newX, newY]) =>
            newX === x &&
            newY === y &&
            newX >= 0 &&
            newY >= 0 &&
            newX < this.gridSize &&
            newY < this.gridSize
        );
      }

      if (isValidSelection) {
        this.addToSelection(x, y);
      }
      this.sound.play("tileSelect");
    }
  }

  getFinalScore() {
    return this.score == null || this.score === 0 ? 1 : this.score;
  }

  // One submission per game: the watchdog and finishGame share the same
  // in-flight request, which resolves to whether the score was saved.
  submitFinalScore() {
    this.submission ??= this.sendFinalScore();
    return this.submission;
  }

  async sendFinalScore() {
    this.player.score = this.getFinalScore();

    try {
      await new GameService(API_BASE_URL).updatePlayers({
        gameId: this.game.code,
        id: this.player.id,
        name: this.player.nickname,
        score: this.player.score,
        words: this.correctSelectedWords.map((word) => word.toLowerCase()),
      });
      return true;
    } catch (error) {
      console.error("Failed to submit final score:", error);
      return false;
    }
  }

  // Remaining time derives from the wall clock, so it stays correct while the
  // game loop is paused (e.g. the tab is hidden).
  updateTimer() {
    const remainingMs = Math.max(0, this.endTime - Date.now());
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (remainingSeconds !== this.lastDisplayedSeconds) {
      this.lastDisplayedSeconds = remainingSeconds;
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      this.timerText.setText(
        `Time: ${minutes < 10 ? "0" + minutes : minutes}:${
          seconds < 10 ? "0" + seconds : seconds
        }`
      );
    }

    if (remainingMs === 0) {
      this.finishGame();
    }
  }

  finishGame() {
    if (this.finished) {
      return;
    }

    this.finished = true;
    window.clearTimeout(this.deadlineTimeout);
    this.clearHintTimeout();
    this.player.score = this.getFinalScore();
    this.scene.stop();
    this.scene.start("Leaderboard", {
      player: this.player,
      game: this.game,
      scoreSubmission: this.submission,
      words: this.correctSelectedWords,
    });
  }
}
