const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let grid = [];
const gridSize = 4;
const cellSize = 100;
let selectedLetters = [];
let selectedText;
let isSelecting = false;
let prevSelectionCordinates = [];

function preload() {
    this.load.image('background', 'path/to/background/image');  // Optional background image
}

function create() {
    // Optional background
    this.add.image(400, 300, 'background');

    // Calculate the starting position to center the grid
    const startX = (config.width - gridSize * cellSize) / 2;
    const startY = (config.height - gridSize * cellSize) / 2;

    // Create the grid of letters
    for (let y = 0; y < gridSize; y++) {
        grid[y] = [];
        for (let x = 0; x < gridSize; x++) {
            const letter = String.fromCharCode(65 + Phaser.Math.Between(0, 25)); // Random letter from A-Z

            // Create a container to hold the box and the letter
            const container = this.add.container(startX + x * cellSize + cellSize / 2, startY + y * cellSize + cellSize / 2);
            
            // Create the box
            const box = this.add.rectangle(0, 0, cellSize, cellSize, 0xeeeeee);
            box.setStrokeStyle(2, 0x000000);
            container.add(box);

            // Create the letter
            const text = this.add.text(0, 0, letter, { fontSize: '48px', fill: 'black' });
            text.setOrigin(0.5, 0.5);
            container.add(text);

            container.setSize(cellSize, cellSize);
            container.setInteractive();
            container.selected = false;
            container.id = x.toString() + y.toString();
            container.on('pointerover', () => selectBox(container, text, false, x, y));
            container.on('pointerdown', () => selectBox(container, text, true, x, y));
            grid[y][x] = { container, text, box };
        }
    }

    // Text to display selected letters
    selectedText = this.add.text(50, 500, 'Selected: ', { fontSize: '32px', fill: 'white' });

    // Input events
    this.input.on('pointerup', endSelection);
}

function update() {
    selectedText.setText('Selected: ' + selectedLetters.join(''));
}

function endSelection(pointer) {
    isSelecting = false;
}

function selectBox(container, text, isStartSelecting, x, y) {
    if(isStartSelecting){
        isSelecting = true;
        selectedLetters = []; // Clear previous selection
        prevSelectionCordinates = [x,y];
        grid.forEach(row => row.forEach(cell => {            
            if(container.id != cell.container.id){ // Only reset non selected cells
                cell.container.selected = false;
                cell.text.setColor('black'); // Reset color of letters
                cell.box.setFillStyle(0xeeeeee); // Reset color of boxes
            }
        }));
    }

    // TODO: Valdiate next container selection is valid by making sure its adjacent to the current selection

    if (isSelecting && !container.selected) {
        text.setColor('#f00');  // Change color of letter to indicate selection
        container.getAt(0).setFillStyle(0xffaaaa);  // Change color of box to indicate selection
        container.selected = true;
        selectedLetters.push(text.text);
        prevSelectionCordinates = [x,y];
    }
}
