import {
    createEmptyInfoProvider, destroy, start, togglePause, update,
    Neighbourhoods, Tessellations
} from './hexlife.js';

let field;
let body;
let activeCell = null;
let state = {
    tessellation: 'HEX',
    neighbourhood: 'HEX',
    wrap: true,
};
const infoProvider = createEmptyInfoProvider();

function e(tag, attrs, children) {
    const element = document.createElement(tag);
    for (const attr of Object.entries(attrs)) {
        const [name, value] = attr;
        if (name.startsWith('on')) {
            element[name] = value;
        } else {
            element.setAttribute(name, value);
        }
    }
    if (Array.isArray(children)) {
        for (const child of children) {
            element.appendChild(Node.prototype.isPrototypeOf(child)
                ? child
                : document.createTextNode(child)
            );
        }
    } else {
        element.appendChild(document.createTextNode(children));
    }
    return element;
}

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
    document.onclick = function () {
        hideMenu();
    };

    infoProvider.getHeight = () => window.innerHeight;
    infoProvider.getWidth = () => window.innerWidth;
    infoProvider.getTessellation = () => Tessellations[state.tessellation];
    infoProvider.getNeighbourhood = () => Neighbourhoods[state.neighbourhood];
    infoProvider.getEdgeWrapping = () => state.wrap;

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

function toggleMenuVisibility() {
    if (document.getElementById('menu')) {
        hideMenu();
    } else {
        renderMenu();
    }
}

function renderDropdown(label, name, value, values) {
    return e('label', {}, [
        label,
        e('select', {
            name,
            onchange: ({target: {name, value}}) => state[name] = value
        }, values.map(i => e('option', {
            value: i.value,
            ...(i.value === value ? {selected: 'selected'} : {})
        }, i.text)))
    ])
}

function renderMenu() {
    document.body.appendChild(
        e('div', {id: 'menu', onclick: e => e.stopPropagation()}, [
                e('button', {
                    onclick() {
                        hideMenu();
                        restart();
                    }
                }, 'Restart'),
                renderDropdown('Tessellation:', 'tessellation', state.tessellation, [
                    {value: 'RECT', text: 'Rectangular'},
                    {value: 'HEX', text: 'Hexagonal'},
                    {value: 'TRIANGLE', text: 'Triangular'},
                ]),
                renderDropdown('Neighbourhood:', 'neighbourhood', state.neighbourhood, [
                    {value: 'TRI_NEUMANN', text: 'Triangular von Neumann'},
                    {value: 'TRI_MOORE', text: 'Triangular Moore'},
                    {value: 'RECT_NEUMANN', text: 'Rectangular von Neumann'},
                    {value: 'RECT_MOORE', text: 'Rectangular Moore'},
                    {value: 'HEX', text: 'Hexagonal honeycomb'},
                    {value: 'HEX_TRIPOD', text: 'Hexagonal tripod'},
                    {value: 'HEX_STAR', text: 'Hexagonal star'},
                ]),
                e('label', {}, [
                    'Edge wrap:',
                    e('input', {
                        name: 'wrap', type: 'checkbox',
                        onchange: ({target: {name, checked}}) => state[name] = checked,
                        ...(state.wrap ? {checked: 'checked'} : {})
                    }),
                ]),
            ],
        )
    );
}

function hideMenu() {
    document.getElementById('menu').remove();
}
