import {
    createEmptyInfoProvider, destroy, start, togglePause, update,
    Neighbourhoods, Tessellations
} from './hexlife.js';
let menuStyle;
let field;
let body;
let activeCell = null;
const infoProvider = createEmptyInfoProvider();

function deepFreeze(object) {
    if (null == object) {
        return object;
    }
    const propNames = Object.getOwnPropertyNames(object);

    for (let name of propNames) {
        object[name] = deepFreeze(object[name]);
    }

    return Object.freeze(object);
}

const ALL_CAPS = /^[A-Z]+(_[A-Z]+)*$/;
/*
* Clones object deeply, excluding all-caps fields - they are copied by ref
* */
function deepClone(object) {
    const propNames = Object.getOwnPropertyNames(object);
    const newObject = {};

    for (let name of propNames) {
        let value = object[name];
        newObject[name] = (ALL_CAPS.test(name) || value == null || typeof value !== "object")
            ? newObject[name] = value
            : deepClone(value);
    }

    return Object.freeze(object);
}
export function onLoad() {
    menuStyle = document.getElementById("menu").style;
    const neighbourhood = document.getElementById("neighbourhood");
    const tessellation = document.getElementById("tessellation");
    const wrap = document.getElementById("wrap");
    body = document.getElementsByTagName("body")[0];

    document.onmousemove = (e) => {
        activeCell = e.target.cell;
    };

    document.onkeypress = (event) => {
        switch (event.key) {
            case "p":
                togglePause();
                break;
            case "Enter":
                update();
                break;
            case "R":
                restart();
                break;
            case '`':
            case 'm':
                toggleMenuVisibility(0, 0);
                break;
            case ' ':
                activeCell && activeCell.toggleState();
                break;
        }
    };
    document.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleMenuVisibility(event.clientX, event.clientY);
        return false;
    });
    document.onclick = function() {hideMenu();};

    for (let option of neighbourhood.options) {
        option.displacements = Neighbourhoods[option.value];
    }

    for (let option of tessellation.options) {
        option.tesselation = Tessellations[option.value];
    }

    infoProvider.getHeight = () => window.innerHeight;
    infoProvider.getWidth = () => window.innerWidth;
    infoProvider.getTessellation = () => tessellation.selectedOptions[0].tesselation;
    infoProvider.getNeighbourhood = () => neighbourhood.selectedOptions[0].displacements;
    infoProvider.getEdgeWrapping = () => wrap.checked;

    field = start(infoProvider);
    body.appendChild(field);
}
function restart() {
    field.parentNode.removeChild(field);
    destroy();
    activeCell = null;
    field = start(infoProvider);
    body.appendChild(field);
}
function toggleMenuVisibility(x, y) {
    if (menuStyle.display === "none") {
        renderMenu(x, y);
    } else {
        hideMenu();
    }
}
function renderMenu(x, y) {
    menuStyle.left = x + "px";
    menuStyle.top = y + "px";
    menuStyle.display = "block";
}
function hideMenu() {
    menuStyle.display = "none";
}
