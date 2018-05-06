"use strict";

const SVG_URI = "http://www.w3.org/2000/svg";

const cellDiameter = 10;
const density = .3;
const generationDelay = 100;

let cellType;
let displacements;
let wrap;

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
        let sum = 0;
        const neighbours = this.neighbours;
        let i;
        for (i = 0; i < (neighbours.length|0); i++) {
            sum += neighbours[i].state|0;
        }
        this.sum = sum;
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

        return {
            cellsX, cellsY,
            shape: [
                [0, 0],
                [cellDiameter, 0],
                [cellDiameter, effectiveCellHeight],
                [0, effectiveCellHeight]
            ],
            getPath: (x, y) => {
                x = x | 0;
                y = y | 0;
                let i;
                let point;
                let path = "";
                for (i = 0; i < shape.length; i++) {
                    point = shape[i];
                    path += (point[0] + x * cellDiameter) + "," + (point[1] + y * effectiveCellHeight) + " ";
                }
                return path
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
            shape,
            getPath: (x, y) => {
                x = x|0;
                y = y|0;
                let i;
                let point;
                const effectiveX = ((x << 1) + y) % semiCellsX;
                const offsetX = effectiveX * cellRadius;
                const offsetY = y * effectiveCellHeight;
                let path = "";
                for (i = 0; i < shape.length; i++) {
                    point = shape[i];
                    path += (point[0] + offsetX) + "," + (point[1] + offsetY) + " ";
                }
                return path;
            }
        }
    },
    TRIANGLE: (width, height, cellDiameter) => {
        const effectiveCellHeight = (cellDiameter / Math.tan(Math.PI / 3)) | 0;
        const cellsX = (Math.floor(width / cellDiameter) - 1)|0;
        const cellsY = (Math.floor(height / effectiveCellHeight) - 1)|0;
        return {
            cellsX, cellsY,
            shape: [
                [0, 0],
                [cellDiameter, effectiveCellHeight],
                [0, effectiveCellHeight * 2]
            ],
            getPath: (x, y) => {
                x = x|0;
                y = y|0;
                let i;
                let point;
                let path = "";
                const isOddDiagonal = (x + y) % 2;
                const direction = isOddDiagonal ? -1 : 1;
                const offsetX = x * cellDiameter + (isOddDiagonal ? cellDiameter : 0);
                const offsetY = y * effectiveCellHeight;
                for (i = 0; i < shape.length; i++) {
                    point = shape[i];
                    const _x = direction * point[0] + offsetX;
                    path += _x + "," + (point[1] + offsetY) + " ";
                }
                return path;
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

const getNeighbours = function(grid, x, y) {
    x = x|0;
    y = y|0;
    const result = [];
    const isOddDiagonal = (x + y) % 2;
    const isTriangular = cellType === Tessellations.TRIANGLE;
    const reflected = isOddDiagonal && isTriangular;
    let i;
    let d;
    for (i = 0; i < displacements.length; i++) {
        d = displacements[i];
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

function initNeighbours() {
    let x, y;
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].neighbours = getNeighbours(grid, x, y);
        }
    }
}

let paused = false;
function update() {
    if (paused) return;
    let x, y;
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].updateSum();
        }
    }
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].updateState();
        }
    }
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].updateCss();
        }
    }
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

function destroyNeighbours() {
    let x, y;
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].neighbours = undefined;
        }
    }
}

function destroyGrid() {
    let x, y;
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].view.remove();
            grid[x][y] = undefined;
        }
        grid[x] = undefined;
    }
    grid = [];
}

function destroy() {
    stopTimer();
    destroyNeighbours();
    destroyGrid();
}

function start(infoProvider) {
    field = document.createElementNS(SVG_URI, "svg");
    const height = infoProvider.getHeight();
    const width = infoProvider.getWidth();
    cellType = infoProvider.getCellType();
    displacements = infoProvider.getNeighbourDisplacements();
    wrap = infoProvider.getEdgeWrapping();

    let tessellation = cellType(width, height, cellDiameter);
    let { getPath } = tessellation;

    ({ cellsX, cellsY } = tessellation);

    field.setAttribute("height", height + "px");
    field.setAttribute("width", width + "px");

    initGrid(field, getPath);
    initNeighbours();
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