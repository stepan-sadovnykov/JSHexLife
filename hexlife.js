"use strict";

const SVG_URI = "http://www.w3.org/2000/svg";

const generationDelay = 100;

let grid = null;
let timer;
let paused = false;

class Cell {
    constructor(field, getPath, x, y, state) {
        this.state = state;
        this.sum = 0;
        this.view = Cell.createCellView(field, getPath, x, y);
        this.view.onclick = () => this.toggleState();
        this.view.cell = this;
        this.neighbours = [];
    }

    updateSum() {
        this.sum = this.neighbours.reduce((a, n) => a + n.state|0, 0);
    }

    updateState(keep, spawn) {
        const sumMask = 1 << this.sum;
        this.state = !!(this.state ? (sumMask & keep) : (sumMask & spawn));
    }

    updateCss() {
        this.view.classList.toggle("true", !!this.state);
    }

    toggleState() {
        this.state = !this.state;
        this.updateCss();
    }

    static createCellView(field, getPath, x, y) {
        x = x|0;
        y = y|0;

        const item = document.createElementNS(SVG_URI, "polygon");
        item.setAttribute("points", getPath(x, y));
        field.appendChild(item);
        return item;
    }
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
            },
            isReflectedAt: () => false
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
            },
            isReflectedAt: () => false
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
            },
            isReflectedAt: (x, y) => !!((x + y) % 2)
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

function mod(a, b) {
    return ((a % b) + b) % b;
}

const getNeighbours = function(grid, neighbourhood, wrap, x, y) {
    x = x|0;
    y = y|0;
    const result = [];
    const { tessellation: { cellsX, cellsY, isReflectedAt } } = grid;
    const reflected = isReflectedAt(x, y);
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

function initGrid(field, tessellation, density) {
    const { cellsX, cellsY, getPath } = tessellation;
    let x, y;
    console.log(`Init grid ${cellsX} by ${cellsY}: ${cellsX * cellsY} cells`);
    const grid = [];
    for (x = 0; x < cellsX; x++) {
        grid[x] = [];
        for (y = 0; y < cellsY; y++) {
            grid[x][y] = new Cell(field, getPath, x, y, Math.random() < density);
        }
    }
    return grid;
}

function initNeighbours(grid, neighbourhood, wrap) {
    grid.forEach((r, x) => r.forEach((c, y) => c.neighbours = getNeighbours(grid, neighbourhood, wrap, x, y)));
}

function update() {
    const { keep, spawn } = grid;
    grid.forEach(r => r.forEach(c => c.updateSum()));
    grid.forEach(r => r.forEach(c => c.updateState(keep, spawn)));
    grid.forEach(r => r.forEach(c => c.updateCss()));
}

function startTimer() {
    timer = setInterval(() => !paused && update(), generationDelay);
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
        c.view.cell = null;
        c.view.onclick = null;
        c.neighbours = null;
    }));
}

function destroyGrid() {
    let x, y;
    for (x = 0; x < grid.length; x++) {
        for (y = 0; y < grid[x].length; y++) {
            grid[x][y] = null;
        }
        grid[x] = null;
    }
    grid = null;
}

function destroy() {
    stopTimer();
    destroyCells();
    destroyGrid();
}

function start(infoProvider) {
    const field = document.createElementNS(SVG_URI, "svg");
    const { density, keep, spawn, height, width, neighbourhood, wrap, tessellation } = getInfo(infoProvider);

    field.setAttribute("height", height + "px");
    field.setAttribute("width", width + "px");

    grid = initGrid(field, tessellation, density);
    grid.tessellation = tessellation;
    grid.keep = keep;
    grid.spawn = spawn;
    initNeighbours(grid, neighbourhood, wrap);
    startTimer();
    return field;
}

function createEmptyInfoProvider() {
    return {
        getHeight: () => 100,
        getWidth: () => 100,
        getEdgeWrapping: () => true,
        getTessellation: () => Tessellations.HEX,
        getNeighbourhood: () => Neighbourhoods.HEX,
        getKeepRule:  () => 0b0000000001100,
        getSpawnRule: () => 0b0000000001000,
        getDensity: () => .3,
        getCellDiameter: () => 10,
    };
}

function getInfo(infoProvider) {
    const width = infoProvider.getWidth();
    const height = infoProvider.getHeight();
    return {
        density: infoProvider.getDensity(),
        keep: infoProvider.getKeepRule(),
        spawn: infoProvider.getSpawnRule(),
        height,
        width,
        neighbourhood: infoProvider.getNeighbourhood(),
        wrap: infoProvider.getEdgeWrapping(),
        tessellation: infoProvider.getTessellation()(width, height, infoProvider.getCellDiameter()),
    };
}
