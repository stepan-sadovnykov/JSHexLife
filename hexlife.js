"use strict";

var cellDiameter = 20;
function createCellView(field, x, y) {
    var svgUri = "http://www.w3.org/2000/svg";
    var item = document.createElementNS(svgUri, "rect");
    var rectSide = cellDiameter / Math.sqrt(2);
    item.setAttributeNS(null, "width", rectSide + "px");
    item.setAttributeNS(null, "height", rectSide + "px");
    item.setAttributeNS(null, "x", (cellDiameter * x + (cellDiameter - rectSide) / 2) + "px");
    item.setAttributeNS(null, "y", (cellDiameter * y + (cellDiameter - rectSide) / 2) + "px");
    field.appendChild(item);
    return item;
}

var svgField = document.getElementById("svg");
var height = window.innerHeight;
var width = window.innerWidth;
var cellsX = Math.floor(width / cellDiameter);
var cellsY = Math.floor(height / cellDiameter);

svgField.setAttribute("height", height + "px");
svgField.setAttribute("width", width + "px");
var grid = [];

function createCell(x, y) {
    var cell = {};
    cell.state = false;
    cell.sum = Math.floor(Math.random() * 5);
    cell.view = createCellView(svgField, x, y);
    cell.neighbours = [];
    cell.update = function () {
        if (this.sum === undefined) {
            this.sum = 0;
            for (var neighbour of this.neighbours) {
                this.sum += neighbour.state;
            }
        } else {
            this.state = this.state ? (this.sum == 2 || this.sum == 3) : (this.sum == 3);
            this.view.setAttribute("state", this.state);
            this.sum = undefined;
        }
    };
    return cell;
}

function mod(a, b) {
    return ((a % b) + b) % b;
}

function getMooreNeighbours(grid, x, y) {
    return [
        grid[mod((x - 1), cellsX)][mod((y - 1), cellsY)],
        grid[mod((x - 1), cellsX)][mod((y), cellsY)],
        grid[mod((x - 1), cellsX)][mod((y + 1), cellsY)],
        grid[mod((x), cellsX)]  [mod((y - 1), cellsY)],
        grid[mod((x), cellsX)]  [mod((y + 1), cellsY)],
        grid[mod((x + 1), cellsX)][mod((y - 1), cellsY)],
        grid[mod((x + 1), cellsX)][mod((y), cellsY)],
        grid[mod((x + 1), cellsX)][mod((y + 1), cellsY)]
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
function start() {
    window.setInterval(function () {
        var x, y;
        for (x = 0; x < cellsX; x++) {
            for (y = 0; y < cellsY; y++) {
                grid[x][y].update.apply(grid[x][y]);
            }
        }
    }, 50);
}
initGrid();
initNeighbours();
start();