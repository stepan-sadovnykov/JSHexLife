"use strict";

var cellDiameter = 10;
var density = .3;
var generationDelay = 100;

var svgField;
var _infoProvider;

var height;
var width;
var cellType;

var cellsX;
var cellsY;
var cellSide;
var effectiveCellHeight;
var cellRadius;
var grid = [];
var getNeighbours = function() {return []};
var timer;

const CellTypes = {
    RECT: 0,
    HEX: 1,
    TRIANGLE: 2
};

function createCellView(field, x, y) {
    var svgUri = "http://www.w3.org/2000/svg";
    var item;
    switch (cellType) {
        case CellTypes.RECT:
            item = document.createElementNS(svgUri, "rect");
            item.setAttributeNS(null, "width", cellSide + "px");
            item.setAttributeNS(null, "height", cellSide + "px");
            item.setAttributeNS(null, "x", (cellDiameter * x) + "px");
            item.setAttributeNS(null, "y", (cellDiameter * y) + "px");
            break;
        case CellTypes.HEX:
            item = document.createElementNS(svgUri, "polygon");
            var effectiveX = (x + 0.5 * y) % cellsX;
            var points = [
                [cellRadius, 0],
                [cellDiameter, cellSide / 2],
                [cellDiameter, effectiveCellHeight],
                [cellRadius, cellSide * 2],
                [0, effectiveCellHeight],
                [0, cellSide / 2]
            ];
            var path = "";
            for (var point of points) {
                path += (point[0] + effectiveX * cellDiameter) + "," + (point[1] + y * effectiveCellHeight) + " ";
            }

            item.setAttributeNS(null, "points", path);
            break;
    }
    field.appendChild(item);
    return item;
}

function createCell(x, y) {
    var cell = {};
    cell.state = Math.random() < density;
    cell.sum = undefined;
    cell.view = createCellView(svgField, x, y, CellTypes.HEX);
    cell.neighbours = [];

    cell.view.onclick = function() {
        cell.state = !cell.state;
        cell.view.setAttribute("state", cell.state);
    };
    cell.updateSum = function () {
        cell.sum = 0;
        for (var neighbour of cell.neighbours) {
            cell.sum += neighbour.state;
        }
    };
    cell.updateState = function () {
        cell.state = cell.state ? (cell.sum == 2 || cell.sum == 3) : (cell.sum == 3);
        cell.view.setAttribute("state", cell.state);
    };
    cell.update = function () {
        if (cell.sum === undefined) {
            cell.updateSum();
        } else {
            cell.updateState();
            cell.sum = undefined;
        }
    };
    return cell;
}

function mod(a, b) {
    return ((a % b) + b) % b;
}

const Neighbourhoods ={
    RECT_NEUMANN: function(grid, x, y) {
        return [
            grid[mod((x - 1), cellsX)][mod((y), cellsY)],
            grid[mod((x), cellsX)]  [mod((y - 1), cellsY)],
            grid[mod((x), cellsX)]  [mod((y + 1), cellsY)],
            grid[mod((x + 1), cellsX)][mod((y), cellsY)]
        ];
    },
    RECT_MOORE: function(grid, x, y) {
        return [
            grid[mod((x - 1), cellsX)][mod((y - 1), cellsY)],
            grid[mod((x - 1), cellsX)][mod((y), cellsY)],
            grid[mod((x - 1), cellsX)][mod((y + 1), cellsY)],
            grid[mod((x), cellsX)]  [mod((y - 1), cellsY)],
            grid[mod((x), cellsX)]  [mod((y + 1), cellsY)],
            grid[mod((x + 1), cellsX)][mod((y - 1), cellsY)],
            grid[mod((x + 1), cellsX)][mod((y), cellsY)],
            grid[mod((x + 1), cellsX)][mod((y + 1), cellsY)]
        ];
    },
    HEX: function(grid, x, y) {
        return [
            grid[mod((x - 1), cellsX)][mod((y), cellsY)],
            grid[mod((x - 1), cellsX)][mod((y + 1), cellsY)],
            grid[mod((x), cellsX)]  [mod((y - 1), cellsY)],
            grid[mod((x), cellsX)]  [mod((y + 1), cellsY)],
            grid[mod((x + 1), cellsX)][mod((y - 1), cellsY)],
            grid[mod((x + 1), cellsX)][mod((y), cellsY)]
        ];
    }
};

function initGrid() {
    var x, y;
    for (x = 0; x < cellsX; x++) {
        grid[x] = [];
        for (y = 0; y < cellsY; y++) {
            grid[x][y] = createCell(x, y);
        }
    }
}

function initNeighbours() {
    var x, y;
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].neighbours = getNeighbours(grid, x, y);
        }
    }
}

var paused = false;
function update() {
    if (paused) return;
    var x, y;
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
    var x, y;
    for (x = 0; x < cellsX; x++) {
        for (y = 0; y < cellsY; y++) {
            grid[x][y].neighbours = undefined;
        }
    }
}

function destroyGrid() {
    var x, y;
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

function restart() {
    destroy();
    _start();
}

function start(field, infoProvider) {
    svgField = field;
    _infoProvider = infoProvider;
    _start();
}

function _start() {
    height = _infoProvider.getHeight();
    width = _infoProvider.getWidth();
    cellType = _infoProvider.getCellType();
    getNeighbours = _infoProvider.getNeighboursFunction();

    switch (cellType) {
        case CellTypes.RECT:
            cellSide = cellDiameter;
            effectiveCellHeight = cellDiameter;
            break;
        case CellTypes.HEX:
            cellRadius = cellDiameter / 2;
            cellSide = cellRadius / Math.sin(Math.PI / 3);
            effectiveCellHeight = (cellSide * 3 / 2);
            break;
    }

    cellsX = Math.floor(width / cellDiameter) - 1;
    cellsY = Math.floor(height / effectiveCellHeight) - 1;

    svgField.setAttribute("height", height + "px");
    svgField.setAttribute("width", width + "px");

    initGrid();
    initNeighbours();
    startTimer();
}

function createEmptyInfoProvider() {
    var infoProvider = {};
    infoProvider.getHeight = function() {return 100;};
    infoProvider.getWidth = function() {return 100;};
    infoProvider.getCellType = function() {return CellTypes.HEX;};
    infoProvider.getNeighboursFunction = function() {return Neighbourhoods.HEX;};
    return infoProvider;
}