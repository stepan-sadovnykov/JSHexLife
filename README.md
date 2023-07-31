# [JSHexLife](http://stepan-sadovnykov.github.io/JSHexLife/hexlife.html)
Implementation of the Conway's Game of Life in JS + CSS + SVG, without Canvas.

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

Questions that arose during development (answered and not):
- Will it be faster to use rAF instead of a timer?
   - FPS is just a little higher, but changes appear to be perceptibly faster
       - it seems like rAF is fired several times per render, stuff is just a bit smoother after changing that
   - as a bonus, the page does not consume resources when not focused
- Will it be faster not to rely on :hover, and instead create a mouse handler and set styles with other cells? (moving the cursor with a mouse slows the page down significantly)
- Will it be faster to set properties on an element itself rather than apply style classes? (toggle eats a lot)
   - seems about the same, at least with the timer
   - with rAF the class approach looks faster
   - will it be faster if I switch to Canvas? (though that will lead to more difficulties in determining the cursor position)
- Will it be faster to have a single event handler for the whole field instead of event handlers for all the cells? 