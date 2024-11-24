import { Scene } from 'phaser';

export class Game extends Scene {

  constructor() {
    super('Game')
  }

  init(data){
    this.game = data.game;
  }

  preload() {
    this.loadedGrid = this.game.board.tiles;
    this.loadedWordList = this.game.board.wordList;
  }

  create() {
    const cellSize = 100;
    const cellBuffer = 10;

    this.gridSize = 4;
    this.grid = [];
    this.correctSelectedWords = [];
    this.selectedContainers = [];
    this.selectedText;
    this.isSelecting = false;
    this.prevSelectionCoordinates = [];
    this.timerText;
    this.timeRemaining = 90;
    this.score = 0;

    // Calculate the starting position to center the grid
    const startX = (this.sys.canvas.width - this.gridSize * cellSize) / 2;
    const startY = (this.sys.canvas.height - this.gridSize * cellSize) / 2;

    // Create the grid of letters
    for (let y = 0; y < this.gridSize; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const letter = this.loadedGrid[x][y].toUpperCase();

        // Create a container to hold the box and the letter
        const container = this.add.container(
          startX + x * (cellSize + cellBuffer) + cellSize / 2,
          startY + y * (cellSize + cellBuffer) + cellSize / 2
        );

        // Create the box
        const box = this.add.rectangle(0, 0, cellSize, cellSize, 0xeeeeee);
        box.setStrokeStyle(2, 0x000000);
        container.add(box);

        // Create the letter
        const text = this.add.text(0, 0, letter, {
          fontSize: "48px",
          fill: "black",
        });
        text.setOrigin(0.5, 0.5);
        container.add(text);

        container.setSize(cellSize, cellSize);
        container.setInteractive();
        container.selected = false;
        container.id = x.toString() + y.toString();
        container.letter = letter;
        container.on("pointerover", () =>
          this.selectBox(container, text, false, x, y)
        );
        container.on("pointerdown", () => this.selectBox(container, text, true, x, y));
        this.grid[y][x] = { container, text, box };
      }
    }

    // Text to display selected letters
    this.selectedText = this.add.text(198, 530, "Selected: ", {
      fontSize: "32px",
      fill: "white",
    });

    // Add timer text
    this.timerText = this.add.text(300, 40, "Time: 01:30", {
      fontSize: "32px",
      fill: "#ffffff",
    });

    // Add Score text
    this.scoreText = this.add.text(198, 560, "Points:", {
      fontSize: "32px",
      fill: "#ffffff",
    });

    // Set up timer event to decrement the timer every second
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });

    // Input events
    this.input.on("pointerup", this.endSelection);
  }

  update() {
    this.selectedText.setText("Selected: " + this.getSelectedText());
    this.scoreText.setText("Score: " + this.score);
  }

  getSelectedText() {
    return this.selectedContainers
      .map((selectedContainer) => selectedContainer.container.letter)
      .join("");
  }

  endSelection(pointer) {
    // Check if the selected letters form a valid word
    let selectedWord = this.scene.getSelectedText();
    if (
      this.scene.loadedWordList.hasOwnProperty(selectedWord.toLowerCase()) &&
      !this.scene.correctSelectedWords.includes(selectedWord)
    ) {
      // Highlight the selected letters in green if they form a valid word
      this.scene.selectedContainers.forEach((container) => {
        container.text.setColor("black");
        container.box.setFillStyle(0x00ff00);
      });
      this.scene.correctSelectedWords.push(selectedWord);
      this.scene.score += this.scene.loadedWordList[selectedWord.toLowerCase()];
    } else if (this.scene.correctSelectedWords.includes(selectedWord)) {
      this.scene.selectedContainers.forEach((container) => {
        container.text.setColor("white");
        container.box.setFillStyle(0xffcc00);
      });
    } else {
      this.scene.selectedContainers.forEach((container) => {
        container.text.setColor("white");
        container.box.setFillStyle(0xff0000);
      });
    }

    // Reset for a new selection
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
          cell.text.setColor("black");
          cell.box.setFillStyle(0xeeeeee);
        }
      })
    );
  }

  selectBox(container, text, isStartSelecting, x, y) {
    if (isStartSelecting) {
      this.isSelecting = true;
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          {
            cell.container.selected = false;
            cell.text.setColor("black");
            cell.box.setFillStyle(0xeeeeee);
          }
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
        text.setColor("#FFFFFF");
        container.getAt(0).setFillStyle(0x6fa8dc);
        container.selected = true;
        this.selectedContainers.push({ container, text, box: container.getAt(0) });
        this.prevSelectionCoordinates = [x, y];
      }
    }
  }

  updateTimer() {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      let minutes = Math.floor(this.timeRemaining / 60);
      let seconds = this.timeRemaining % 60;
      this.timerText.setText(
        `Time: ${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds
        }`
      );
    } else {
      this.timerText.setText("Time: 00:00");
      this.scene.stop();
      this.scene.start('Leaderboard', { score: this.score });
    }
  }
}
