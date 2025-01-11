import { Scene } from "phaser";
import Colors from "../constants";

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
    this.timeRemaining = 90;
    this.score = 0;

    const totalGridWidth =
      this.gridSize * cellSize + cellBuffer * (this.gridSize - 1);
    const totalGridHeight =
      this.gridSize * cellSize + cellBuffer * (this.gridSize - 1);

    const startX = (width - totalGridWidth) / 2;
    const startY = (height - totalGridHeight) / 2;

    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const letter = this.loadedGrid[x][y].toUpperCase();

        const container = this.add.container(
          startX + x * (cellSize + cellBuffer),
          startY + y * (cellSize + cellBuffer)
        );

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
          fontSize: isMobile ? Math.floor(cellSize / 2) + "px" : "44px",
          fontFamily: 'standard',
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

    if (!isMobile) {
      this.selectedText = this.add.text(138, height - 30, "Selected: ", {
        fontSize: "20px",
        fontFamily: 'standard',
        fill: Colors.WHITE.anchor,
      });

      this.timerText = this.add.text(254, height - 590, "Time: 01:30", {
        fontSize: "26px",
        fontFamily: 'standard',
        fill: Colors.WHITE.anchor,
      });

      this.scoreText = this.add.text(500, height - 30, "Score:", {
        fontSize: "20px",
        fontFamily: 'standard',
        fill: Colors.WHITE.anchor,
      });
    } else {
      this.selectedText = this.add.text(startX, startY + 314, "Selected: ", {
        fontSize: "18px",
        fontFamily: 'standard',
        fill: Colors.WHITE.anchor,
      });

      this.timerText = this.add.text(startX + 60, startY - 20, "Time: 01:30", {
        fontSize: "18px",
        fontFamily: 'standard',
        fill: Colors.WHITE.anchor,
      });

      this.scoreText = this.add.text(startX, startY + 334, "Score:", {
        fontSize: "18px",
        fontFamily: 'standard',
        fill: Colors.WHITE.anchor,
      });
    }

    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer.bind(this),
      loop: true,
    });

    this.input.on("pointerup", this.endSelection);
  }

  update() {
    this.selectedText.setText("Selected:" + this.getSelectedText());
    this.scoreText.setText("Score:" + this.score);
  }

  getSelectedText() {
    return this.selectedContainers
      .map((selectedContainer) => selectedContainer.container.letter)
      .join("");
  }

  endSelection(pointer) {
    let selectedWord = this.scene.getSelectedText();
    if (
      this.scene.loadedWordList.hasOwnProperty(selectedWord.toLowerCase()) &&
      !this.scene.correctSelectedWords.includes(selectedWord)
    ) {
      this.scene.selectedContainers.forEach((container) => {
        container.text.setColor(Colors.BLACK.anchor);
        container.box.setFillStyle(Colors.GREEN.hex);
      });
      this.scene.correctSelectedWords.push(selectedWord);
      this.scene.score += this.scene.loadedWordList[selectedWord.toLowerCase()];
      this.scene.sound.play("wordSuccess");
    } else if (this.scene.correctSelectedWords.includes(selectedWord)) {
      this.scene.selectedContainers.forEach((container) => {
        container.text.setColor(Colors.WHITE.anchor);
        container.box.setFillStyle(Colors.ORANGE.hex);
      });
      this.scene.sound.play("wordFail");
    } else {
      this.scene.selectedContainers.forEach((container) => {
        container.text.setColor(Colors.WHITE.anchor);
        container.box.setFillStyle(Colors.RED.hex);
      });
      this.scene.sound.play("wordFail");
    }

    this.scene.isSelecting = false;
    this.scene.prevSelectionCoordinates = [];
    this.scene.selectedContainers = [];
    this.scene.grid.forEach((row) =>
      row.forEach((cell) => {
        if (
          this.scene.selectedContainers.some(
            (selectedContainer) =>
              selectedContainer.container.id != cell.container.id
          )
        ) {
          cell.container.selected = false;
          cell.text.setColor(Colors.BLACK.anchor);
          cell.box.setFillStyle(Colors.WHITE.hex);
        }
      })
    );
  }

  selectBox(container, text, isStartSelecting, x, y) {
    if (isStartSelecting) {
      this.isSelecting = true;
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          cell.container.selected = false;
          cell.text.setColor(Colors.BLACK.anchor);
          cell.box.setFillStyle(Colors.WHITE.hex);
        })
      );
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
        text.setColor(Colors.WHITE.anchor);
        container.getAt(0).setFillStyle(Colors.BLUE.hex);
        container.selected = true;
        this.selectedContainers.push({
          container,
          text,
          box: container.getAt(0),
        });
        this.prevSelectionCoordinates = [x, y];
      }
      this.sound.play("tileSelect");
    }
  }

  updateTimer() {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      let minutes = Math.floor(this.timeRemaining / 60);
      let seconds = this.timeRemaining % 60;
      this.timerText.setText(
        `Time: ${minutes < 10 ? "0" + minutes : minutes}:${
          seconds < 10 ? "0" + seconds : seconds
        }`
      );
    } else {
      this.timerText.setText("Time: 00:00");
      this.scene.stop();
      this.player.score =
        this.score == null || this.score === 0 ? 1 : this.score;
      this.scene.start("Leaderboard", { player: this.player, game: this.game });
    }
  }
}