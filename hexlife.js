"use strict";

var cellDiameter = 10;
var density = .3;
var generationDelay = 100;

var svgField;
var height;
var width;
var cellType;

var cellsX;
var cellsY;
var cellSide;
var effectiveCellHeight;
var cellRadius;
var grid = [];
var getNeighbourhood;

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

function getMooreNeighbours(grid, x, y) {
    return [
        //grid[mod((x - 1), cellsX)][mod((y - 1), cellsY)],
        grid[mod((x - 1), cellsX)][mod((y), cellsY)],
        grid[mod((x - 1), cellsX)][mod((y + 1), cellsY)],
        grid[mod((x), cellsX)]  [mod((y - 1), cellsY)],
        grid[mod((x), cellsX)]  [mod((y + 1), cellsY)],
        grid[mod((x + 1), cellsX)][mod((y - 1), cellsY)],
        grid[mod((x + 1), cellsX)][mod((y), cellsY)]//,
        //grid[mod((x + 1), cellsX)][mod((y + 1), cellsY)]
    ]
}

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
            grid[x][y].neighbours = getMooreNeighbours(grid, x, y);
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
    window.setInterval(update, generationDelay);
    document.onkeypress = function(event) {
        if (String.fromCharCode(event.charCode) == "p") {
            paused = !paused;
        }
    }
}

function start(field, h, w, type) {
    svgField = field;
    height = h;
    width = w;
    cellType = type;

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

start(document.getElementById("svg"), window.innerHeight, window.innerWidth, CellTypes.HEX);