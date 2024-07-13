const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);

let grid = [];
let loadedGrid = [
  ["C", "A", "T", "S"],
  ["R", "E", "D", "S"],
  ["O", "T", "I", "P"],
  ["K", "L", "M", "E"],
];
let loadedWordList = [
  "CAT",
  "CATS",
  "PIE",
  "RED",
  "REDS",
  "PITS",
  "TIME",
];
const gridSize = 4;
const cellSize = 100;
const cellBuffer = 10;
let correctSelectedWords = [];
let selectedContainers = [];
let selectedText;
let isSelecting = false;
let prevSelectionCordinates = [];
let timerText;
let timeRemaining = 90; // 1 minute and 30 seconds

function preload() {
  //this.load.image("background", "path/to/background/image"); // Optional background image
}

function create() {
  // Optional background
  //this.add.image(400, 300, "background");

  // Calculate the starting position to center the grid
  const startX = (config.width - gridSize * cellSize) / 2;
  const startY = (config.height - gridSize * cellSize) / 2;

  // Create the grid of letters
  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      const letter = loadedGrid[x][y];

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
        selectBox(container, text, false, x, y)
      );
      container.on("pointerdown", () => selectBox(container, text, true, x, y));
      grid[y][x] = { container, text, box };
    }
  }

  // Text to display selected letters
  selectedText = this.add.text(198, 530, "Selected: ", {
    fontSize: "32px",
    fill: "white",
  });

  // Add timer text
  timerText = this.add.text(300, 40, "Time: 01:30", {
    fontSize: "32px",
    fill: "#ffffff",
  });

  // Set up timer event to decrement the timer every second
  this.time.addEvent({
    delay: 1000,
    callback: updateTimer,
    callbackScope: this,
    loop: true,
  });

  // Input events
  this.input.on("pointerup", endSelection);
}

function update() {
  selectedText.setText("Selected: " + getSelectedText());
}

function getSelectedText() {
  return selectedContainers
    .map((selectedContainer) => selectedContainer.container.letter)
    .join("");
}

function endSelection(pointer) {
  // Check if the selected letters form a valid word
  const selectedWord = getSelectedText();
  if (
    loadedWordList.includes(selectedWord) &&
    !correctSelectedWords.includes(selectedWord)
  ) {
    // Highlight the selected letters in green if they form a valid word
    selectedContainers.forEach((container) => {
      container.text.setColor("black");
      container.box.setFillStyle(0x00ff00);
    });
    correctSelectedWords.push(selectedWord);
  } else if (correctSelectedWords.includes(selectedWord)) {
    selectedContainers.forEach((container) => {
      container.text.setColor("white");
      container.box.setFillStyle(0xffcc00);
    });
  } else {
    selectedContainers.forEach((container) => {
      container.text.setColor("white");
      container.box.setFillStyle(0xff0000);
    });
  }

  // Reset for a new selection
  isSelecting = false;
  prevSelectionCordinates = [];
  selectedContainers = [];
  grid.forEach((row) =>
    row.forEach((cell) => {
      if (
        selectedContainers.some(
          (selectedContainer) =>
            selectedContainer.container.id != cell.container.id
        )
      ) {
        cell.container.selected = false;
        cell.text.setColor("black"); // Reset color of letters
        cell.box.setFillStyle(0xeeeeee); // Reset color of boxes
      }
    })
  );
}

function selectBox(container, text, isStartSelecting, x, y) {
  if (isStartSelecting) {
    isSelecting = true;
    grid.forEach((row) =>
      row.forEach((cell) => {
        {
          cell.container.selected = false;
          cell.text.setColor("black"); // Reset color of letters
          cell.box.setFillStyle(0xeeeeee); // Reset color of boxes
        }
      })
    );
  }

  if (isSelecting && !container.selected) {
    let isValidSelection = true;
    if (prevSelectionCordinates.length == 2) {
      const [prevX, prevY] = prevSelectionCordinates;

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
          newX < gridSize &&
          newY < gridSize
      );
    }

    if (isValidSelection) {
      text.setColor("#FFFFFF"); // Change color of letter to indicate selection
      container.getAt(0).setFillStyle(0x6fa8dc); // Change color of box to indicate selection
      container.selected = true;
      selectedContainers.push({ container, text, box: container.getAt(0) });
      prevSelectionCordinates = [x, y];
    }
  }
}

function updateTimer() {
  if (timeRemaining > 0) {
    timeRemaining--;
    let minutes = Math.floor(timeRemaining / 60);
    let seconds = timeRemaining % 60;
    timerText.setText(
      `Time: ${minutes < 10 ? "0" + minutes : minutes}:${
        seconds < 10 ? "0" + seconds : seconds
      }`
    );
  } else {
    // Handle what happens when the timer reaches 0
    timerText.setText("Time: 00:00");
    this.scene.pause(); // Optionally pause the game
  }
}
