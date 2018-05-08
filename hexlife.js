"use strict";

const SVG_URI = "http://www.w3.org/2000/svg";

const cellDiameter = 10;
const density = .3;
const generationDelay = 100;

let cellType;

let cellsX;
let cellsY;
let grid = [];
let timer;
let activeCell = null;

const keep   = 0b0000000001100;
const create = 0b0000000001000;

document.onmousemove = function (e) {
    activeCell = e.target.cell;
};

class Cell {
    constructor(field, getPath, x, y) {
        this.state = Math.random() < density;
        this.sum = 0;
        this.view = createCellView(field, getPath, x, y);
        this.view.onclick = () => this.toggleState();
        this.view.cell = this;
        this.neighbours = [];
    }

    updateSum() {
        this.sum = this.neighbours.reduce((a, n) => a + n.state|0, 0);
    }

    updateState() {
        const sumMask = 1 << this.sum;
        this.state = !!(this.state ? (sumMask & keep) : (sumMask & create));
    }

    updateCss() {
        this.view.classList.toggle("true", !!this.state);
    }

    toggleState() {
        this.state = !this.state;
        this.updateCss();
    }
}

function createCellView(field, getPath, x, y) {
    x = x|0;
    y = y|0;

    let item;
    item = document.createElementNS(SVG_URI, "polygon");
    item.setAttribute("points", getPath(x, y));
    field.appendChild(item);
    return item;
}

function mod(a, b) {
    return ((a % b) + b) % b;
}

const Tessellations = {
    RECT: (width, height, cellDiameter) => {
        const effectiveCellHeight = cellDiameter | 0;
        const cellsX = (Math.floor(width / cellDiameter) - 1)|0;
        const cellsY = (Math.floor(height / effectiveCellHeight) - 1)|0;
        const shape = [
            [0, 0],
            [cellDiameter, 0],
            [cellDiameter, effectiveCellHeight],
            [0, effectiveCellHeight]
        ];

        return {
            cellsX, cellsY,
            getPath: (x, y) => {
                x = x | 0;
                y = y | 0;
                return shape
                    .map(point => (point[0] + x * cellDiameter) + "," + (point[1] + y * effectiveCellHeight))
                    .join(" ");
            }
        }
    },
    HEX: (width, height, cellDiameter) => {
        const cellRadius = cellDiameter >> 1;
        const cellSide = cellRadius / Math.sin(Math.PI / 3);
        const effectiveCellHeight = (cellSide * 3 / 2) | 0;
        const cellsX = (Math.floor(width / cellDiameter) - 1)|0;
        const semiCellsX = cellsX << 1;
        const cellsY = (Math.floor(height / effectiveCellHeight) - 1)|0;
        const shape = [
            [cellRadius, 0],
            [cellDiameter, cellSide / 2],
            [cellDiameter, effectiveCellHeight],
            [cellRadius, cellSide * 2],
            [0, effectiveCellHeight],
            [0, cellSide / 2]
        ];
        return {
            cellsX, cellsY,
            getPath: (x, y) => {
                x = x|0;
                y = y|0;
                const effectiveX = ((x << 1) + y) % semiCellsX;
                const offsetX = effectiveX * cellRadius;
                const offsetY = y * effectiveCellHeight;
                return shape
                    .map(point => (point[0] + offsetX) + "," + (point[1] + offsetY))
                    .join(" ");
            }
        }
    },
    TRIANGLE: (width, height, cellDiameter) => {
        const effectiveCellHeight = (cellDiameter / Math.tan(Math.PI / 3)) | 0;
        const cellsX = (Math.floor(width / cellDiameter) - 1)|0;
        const cellsY = (Math.floor(height / effectiveCellHeight) - 1)|0;
        const shape = [
            [0, 0],
            [cellDiameter, effectiveCellHeight],
            [0, effectiveCellHeight * 2]
        ];

        return {
            cellsX, cellsY,
            getPath: (x, y) => {
                x = x|0;
                y = y|0;
                const isOddDiagonal = (x + y) % 2;
                const direction = isOddDiagonal ? -1 : 1;
                const offsetX = x * cellDiameter + (isOddDiagonal ? cellDiameter : 0);
                const offsetY = y * effectiveCellHeight;
                return shape
                    .map(point => (direction * point[0] + offsetX) + "," + (point[1] + offsetY))
                    .join(" ");
            }
        };
    }
};

const Neighbourhoods ={
    RECT_NEUMANN: [
                      [ 0, -1],
            [-1,  0],           [ 1,  0],
                      [ 0,  1]
        ],
    TRI_NEUMANN: [
                      [ 0, -1],
            [-1,  0],
                      [ 0,  1]
    ],
    RECT_MOORE: [
            [-1, -1], [ 0, -1], [ 1, -1],
            [-1,  0],           [ 1,  0],
            [-1,  1], [ 0,  1], [ 1,  1]
        ],
    TRI_MOORE: [
            [-1, -2], [ 0, -2],
            [-1, -1], [ 0, -1], [ 1, -1],
            [-1,  0],           [ 1,  0],
            [-1,  1], [ 0,  1], [ 1,  1],
            [-1,  2], [ 0,  2]
    ],
    HEX_TRIPOD: [
                                [ 1, -1],
            [-1,  0],
                      [ 0,  1]
    ],
    HEX: [
                      [ 0, -1], [ 1, -1],
            [-1,  0],           [ 1,  0],
            [-1,  1], [ 0,  1]
        ],
    HEX_STAR: [
                                    [ 1, -2],
                [-1, -1], [ 0, -1], [ 1, -1], [ 2, -1],
                [-1,  0],           [ 1,  0],
      [-2,  1], [-1,  1], [ 0,  1], [ 1,  1],
                [-1,  2]
    ]
};

const getNeighbours = function(grid, neighbourhood, wrap, x, y) {
    x = x|0;
    y = y|0;
    const result = [];
    const isOddDiagonal = (x + y) % 2;
    const isTriangular = cellType === Tessellations.TRIANGLE;
    const reflected = isOddDiagonal && isTriangular;
    let i;
    let d;
    for (i = 0; i < neighbourhood.length; i++) {
        d = neighbourhood[i];
        const unwrapped_x = x + (reflected ? -1 : 1) * d[0];
        const unwrapped_y = y + d[1];
        const _x = mod(unwrapped_x, cellsX);
        const _y = mod(unwrapped_y, cellsY);
        if (!wrap && (_x !== unwrapped_x || _y !== unwrapped_y))
            continue;
        result.push(grid[_x][_y]);
    }
    return result;
};

function initGrid(field, getPath) {
    let x, y;
    console.log(`Init grid ${cellsX} by ${cellsY}: ${cellsX * cellsY} cells`);
    for (x = 0; x < cellsX; x++) {
        grid[x] = [];
        for (y = 0; y < cellsY; y++) {
            grid[x][y] = new Cell(field, getPath, x, y);
        }
    }
}

function initNeighbours(neighbourhood, wrap) {
    grid.forEach((r, x) => r.forEach((c, y) => c.neighbours = getNeighbours(grid, neighbourhood, wrap, x, y)));
}

let paused = false;
function update() {
    if (paused) return;
    grid.forEach(r => r.forEach(c => c.updateSum()));
    grid.forEach(r => r.forEach(c => c.updateState()));
    grid.forEach(r => r.forEach(c => c.updateCss()));
}

function startTimer() {
    timer = setInterval(update, generationDelay);
}

function togglePause() {
    paused = !paused;
}

function stopTimer() {
    clearInterval(timer);
}

function destroyCells() {
    grid.forEach(r => r.forEach(c => {
        c.view.remove();
        c.view.cell = undefined;
        c.view.onclick = undefined;
        c.neighbours = undefined
    }));
}

function destroyGrid() {
    let x, y;
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y] = undefined;
        }
        grid[x] = undefined;
    }
    grid = [];
}

function destroy() {
    stopTimer();
    destroyCells();
    destroyGrid();
}

function start(infoProvider) {
    const field = document.createElementNS(SVG_URI, "svg");
    const height = infoProvider.getHeight();
    const width = infoProvider.getWidth();
    cellType = infoProvider.getCellType();
    const neighbourhood = infoProvider.getNeighbourDisplacements();
    const wrap = infoProvider.getEdgeWrapping();

    let tessellation = cellType(width, height, cellDiameter);
    let { getPath } = tessellation;

    ({ cellsX, cellsY } = tessellation);

    field.setAttribute("height", height + "px");
    field.setAttribute("width", width + "px");

    initGrid(field, getPath);
    initNeighbours(neighbourhood, wrap);
    startTimer();
    return field;
}

function createEmptyInfoProvider() {
    const infoProvider = {};
    infoProvider.getHeight = function() {return 100;};
    infoProvider.getWidth = function() {return 100;};
    infoProvider.getEdgeWrapping = function() {return true;};
    infoProvider.getCellType = function() {return Tessellations.HEX;};
    infoProvider.getNeighbourDisplacements = function() {return Neighbourhoods.HEX;};
    return infoProvider;
}
