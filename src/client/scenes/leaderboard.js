import { Scene } from "phaser";
import GameService from "../services/gameService";
import Colors, { API_BASE_URL } from "../constants";
import Utils from "../utils";
import { buildResults } from "../results";

const LEADERBOARD_ROWS = 5;
const ROW_HEIGHT = 28;
const WORD_FONT_SIZE = "16px";
const WORD_LINE_SPACING = 6;

export class Leaderboard extends Scene {
  constructor() {
    super("Leaderboard");

    this.pollingInterval = 3000;
    this.pollingDuration = 180000;
    this.loadingDotCount = 1;
  }

  init(data) {
    this.game = data.game;
    this.player = data.player;
    this.scoreSubmission = data.scoreSubmission ?? null;
    this.localWords = data.words ?? [];
    this.polling = true;
    this.active = true;
    this.scrollOffset = 0;
    this.maxScroll = 0;
  }

  preload() {}

  async create() {
    const { width, height } = this.cameras.main;

    this.loadingText = this.add
      .text(width / 2, height * 0.04, "Loading.", {
        fontSize: "16px",
        fontFamily: "standard",
        color: Colors.WHITE.anchor,
      })
      .setOrigin(0.5);

    this.time.addEvent({
      delay: 500,
      callback: this.updateLoadingText,
      callbackScope: this,
      loop: true,
    });

    this.titleText = this.add
      .text(width / 2, height * 0.1, "Results", {
        fontSize: "32px",
        fontFamily: "standard",
        color: Colors.WHITE.anchor,
      })
      .setOrigin(0.5);

    this.createResultsLayout();
    this.createMainMenuButton();

    this.events.once("shutdown", () => {
      this.active = false;
      this.polling = false;
      clearTimeout(this.pollTimeout);
    });

    this.renderResults([]);

    // Wait for any in-flight submission from the game scene instead of
    // sending a second, overlapping update.
    const alreadySubmitted = this.scoreSubmission
      ? await this.scoreSubmission
      : false;
    if (!alreadySubmitted && this.active) {
      await this.updatePlayerScore();
    }
    if (this.active) {
      await this.pollForLeaderboardUpdates();
    }
  }

  updateLoadingText() {
    if (this.polling) {
      this.loadingDotCount = (this.loadingDotCount % 3) + 1;
      const dots = ".".repeat(this.loadingDotCount);
      this.loadingText.setText(`Loading${dots}`);
    }
  }

  createResultsLayout() {
    const { width, height } = this.cameras.main;

    this.leaderboardTop = height * 0.17;
    this.bestWordText = this.add
      .text(width / 2, this.leaderboardTop + LEADERBOARD_ROWS * ROW_HEIGHT + 12, "", {
        fontSize: WORD_FONT_SIZE,
        fontFamily: "standard",
        color: Colors.GREEN.anchor,
        align: "center",
        wordWrap: { width: width * 0.95 },
      })
      .setOrigin(0.5, 0);

    const columnWidth = width * 0.45;
    const headerY = this.bestWordText.y + 48;
    this.wordsTop = headerY + 28;
    this.wordsBottom = height * 0.88;

    const header = (x) =>
      this.add
        .text(x, headerY, "", {
          fontSize: WORD_FONT_SIZE,
          fontFamily: "standard",
          color: Colors.ORANGE.anchor,
        })
        .setOrigin(0.5, 0);
    this.myWordsHeader = header(width * 0.25);
    this.groupWordsHeader = header(width * 0.75);

    const column = (x) =>
      this.add
        .text(x, 0, "", {
          fontSize: WORD_FONT_SIZE,
          fontFamily: "standard",
          color: Colors.WHITE.anchor,
          align: "center",
          lineSpacing: WORD_LINE_SPACING,
          wordWrap: { width: columnWidth },
        })
        .setOrigin(0.5, 0);
    this.myWordsText = column(width * 0.25);
    this.groupWordsText = column(width * 0.75);

    this.wordsContainer = this.add.container(0, this.wordsTop, [
      this.myWordsText,
      this.groupWordsText,
    ]);
    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, this.wordsTop, width, this.wordsBottom - this.wordsTop);
    this.wordsContainer.setMask(maskShape.createGeometryMask());

    this.input.on("wheel", (_pointer, _objects, _dx, dy) => this.scrollWords(dy));
    this.input.on("pointermove", (pointer) => {
      if (pointer.isDown && pointer.y >= this.wordsTop && pointer.y <= this.wordsBottom) {
        this.scrollWords(pointer.prevPosition.y - pointer.y);
      }
    });
  }

  createMainMenuButton() {
    const { width, height } = this.cameras.main;

    const button = this.add
      .text(width / 2, height * 0.94, "Main Menu", {
        fontFamily: "standard",
        fontSize: "24px",
        color: Colors.WHITE.anchor,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setStyle({ fill: Colors.ORANGE.anchor }));
    button.on("pointerout", () => button.setStyle({ fill: Colors.WHITE.anchor }));
    button.on("pointerdown", () => {
      this.sound.play("buttonSelect2");
      this.scene.start("Menu");
    });
  }

  scrollWords(delta) {
    this.scrollOffset = Math.min(Math.max(this.scrollOffset + delta, 0), this.maxScroll);
    this.wordsContainer.y = this.wordsTop - this.scrollOffset;
  }

  async pollForLeaderboardUpdates() {
    const gameService = new GameService(API_BASE_URL);
    const startTime = Date.now();

    const poll = async () => {
      try {
        const response = await gameService.get(this.game.code);
        if (!this.active) {
          return;
        }
        this.renderResults(response.players);

        if (response.status === "DONE") {
          this.loadingText.setText("");
          this.polling = false;
          return;
        }

        if (Date.now() - startTime < this.pollingDuration && this.polling) {
          this.pollTimeout = setTimeout(poll, this.pollingInterval);
        } else {
          this.loadingText.setText("Timeout");
        }
      } catch (error) {
        console.error("Error polling leaderboard updates:", error);
      }
    };

    await poll();
  }

  renderResults(players) {
    this.renderLeaderboard(players);
    this.renderWordSummary(players);
  }

  renderLeaderboard(players) {
    if (this.leaderboardTexts) {
      this.leaderboardTexts.forEach((text) => text.destroy());
    }

    const sortedPlayers = players
      .filter((player) => player.score > 0)
      .map((player) => ({
        ...player,
        name: Utils.normalizeName(player.name) || "Anonymous",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_ROWS);

    const { width } = this.cameras.main;

    this.leaderboardTexts = sortedPlayers.map((player, index) => {
      const rank = index + 1;
      const displayText = `${rank}. ${player.name} - ${player.score}`;
      const isMe = String(player.id).toLowerCase() === String(this.player.id).toLowerCase();
      return this.add
        .text(width * 0.5, this.leaderboardTop + index * ROW_HEIGHT, displayText, {
          fontSize: "24px",
          fontFamily: "standard",
          color: isMe ? Colors.ORANGE.anchor : Colors.WHITE.anchor,
        })
        .setOrigin(0.5, 0);
    });
  }

  renderWordSummary(players) {
    const { myWords, groupWords, best, points } = buildResults({
      players,
      myId: this.player.id,
      localWords: this.localWords,
      wordList: this.game.board?.wordList ?? {},
    });

    this.bestWordText.setText(
      best
        ? `Best word: ${best.word.toUpperCase()} (${points(best.word)} pts)${best.finder ? ` by ${best.finder}` : ""}`
        : "No words found yet"
    );
    this.myWordsHeader.setText(`Your words (${myWords.length})`);
    this.groupWordsHeader.setText(`Group words (${groupWords.length})`);
    this.myWordsText.setText(myWords.map((word) => word.toUpperCase()).join("  ") || "-");
    this.groupWordsText.setText(groupWords.map((word) => word.toUpperCase()).join("  ") || "-");

    const contentHeight = Math.max(this.myWordsText.height, this.groupWordsText.height);
    this.maxScroll = Math.max(0, contentHeight - (this.wordsBottom - this.wordsTop));
    this.scrollWords(0);
  }

  async updatePlayerScore() {
    try {
      const gameService = new GameService(API_BASE_URL);
      const response = await gameService.updatePlayers({
        gameId: this.game.code,
        id: this.player.id,
        name: this.player.nickname,
        score: this.player.score,
        words: this.localWords.map((word) => word.toLowerCase()),
      });

      return response.players;
    } catch (error) {
      console.error("Failed to update player score:", error);
      return [];
    }
  }
}
