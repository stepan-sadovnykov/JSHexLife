# [JSHexLife](http://stepan-sadovnykov.github.io/JSHexLife/hexlife.html)
Implementation of the The Game of Life in JS + CSS + SVG, without Canvas.

Implemented:
- Hexagonal, triangular and square tessellations
- Flat finite or toroidal surface
- Moore neighbourhood (Chebyshev distance = 1)
- Von Neumann neighbourhood (Manhattan distance = 1)
- Hexagonal star, honeycomb and tripod neighbourhoods
- Neighbourhood selection
- Tessellation selection
- Conway's rules
- Pausing
- Click-editing (*not recommended to use in Chrome, as its time to handle click events is at least O(n) of cell count*)
- **Hotkeys**:
  - p: pause
  - m/backtick: menu
  - R: restart
  - Space: toggle cell under cursor
  - Enter: force update

Planned:
- Saving/restoring rules
- Non-Conway rule configuration
- Semi-transparent "paused" overlay
- Tessellation/neighbourhood dependence in the menu

Considering:
- Saving/restoring grid with rules
- Rules with some randomness
- Cell ages
- Saving SVG
