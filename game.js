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
            container.on('pointerover', () => selectBox(container, text, x, y));
            grid[y][x] = { container, text, box };
        }
    }

    // Text to display selected letters
    selectedText = this.add.text(50, 500, 'Selected: ', { fontSize: '32px', fill: 'white' });

    // Input events
    this.input.on('pointerdown', startSelection);
    this.input.on('pointerup', endSelection);
}

let isSelecting = false;

function update() {
    selectedText.setText('Selected: ' + selectedLetters.join(''));
}

function startSelection(pointer) {
    isSelecting = true;
    selectedLetters = []; // Clear previous selection
    grid.forEach(row => row.forEach(container => {
        //console.log(container);
        container.text.setColor('black'); // Reset color of letters
        container.box.setFillStyle(0xeeeeee); // Reset color of boxes
        container.selected = false;
        console.log("reseting container id to false: " + container.id);
        console.log(grid);
    }));
}

function endSelection(pointer) {
    isSelecting = false;
}

function selectBox(container, text, x, y) {
    console.log('isSelecting:', isSelecting);  // Log the isSelecting variable
    console.log('container.selected:', container.selected);  // Log the isSelecting variable
    console.log('container.id:', container.id);  // Log the isSelecting variable
    if (isSelecting && !container.selected) {
        text.setColor('#f00');  // Change color of letter to indicate selection
        container.getAt(0).setFillStyle(0xffaaaa);  // Change color of box to indicate selection
        container.selected = true;
        selectedLetters.push(text.text);
    }
}
