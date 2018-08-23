//Premises (read up on stack overflow)
/*
  - store everything as 1D array

  - store state in grid (alive/dead, active/inactive, live neighbors)
      # = 6 digit binary:
        _ _ _ _   _   _

        2^0:      active status
        2^1:      live/dead
        2^3-2^6: live neighbors

      # from 0->35 inclusive

      #%2 = active status
      increment by +-1

      ⌊#/2⌋%2 = alive status
      increment by +-2

      ⌊#/4⌋ = live neighbors
      increment by +-4

  - store active cells as coordinates in active array


  1. loop through active cells and find which ones will die/birth
    a) if going to change, update index in active array
    b) else update in grid to be inactive

  2. for all spots in updated active array:
    a) find out what the current spot will change to
    b) change all neighbors to active (if not already) and update their live neighbors (because current cell is changing)
    c) push the neighbors to active array
    d) toggle the current cell


  States that will change:
    Technically Inactive, but would change (2, 6, 12, >=18)
    Active, will change (3, 7, 13, >=19)

  Will it live?
    Yes: 10 <= state <= 15
    No: all others
*/



//Variables


// canvas
var canvas = document.getElementById('universe');
canvas.height = canvas.offsetHeight;
canvas.width = canvas.offsetWidth;

var ctx = canvas.getContext('2d');


//event variables
var mouseX,
    mouseY;

var keys;


//drawing
var tile; //size of each cell as displayed

var gridlines;


//grid
var rows,
    cols;
var grid;


//active cells
var activeCells, //cells that are active at start/end of function
    activeCoords; // coordinates of all active cells [x1, y1, x2, y2, ...]

//live cells
var liveCells,
    liveCoords;

var gen; //generations passed


//animation
var fps;
var interval;

var playing;

var animate; //animation loop
var now;
var then;
var delta;


//Functions

//sets up variables, grid, states of all cells, and active array
function init() {
  //init variables
  canvas = document.getElementById('universe');
  canvas.height = canvas.offsetHeight;
  canvas.width = canvas.offsetWidth;

  ctx = canvas.getContext('2d');

  keys = {};

  tile = 10;
  gridlines = false;

  //from gol.js
  rows = Math.floor(canvas.height/tile);
  cols = Math.floor(canvas.width/tile);;

  grid = [];


  activeCells = 0;
  activeCoords = [];


  gen = 0;
  //

  fps = 60;
  interval = 1000/fps;

  playing = false;

  then = Date.now();

  //go through all points
  for(var y = 0; y < rows; y++) {
    for(var x = 0; x < cols; x++) {
      //init grid and states of cells
      grid[y*cols + x] = 1; //sets all cells to active, dead, 0 live neighbors

      //init active array and active cell count
      activeCoords.push(x, y);
      activeCells++;
    }
  }
}


//toggles cell at (x, y) and updates surrounding neighborhood
function toggleCell(x, y) {
  //get the current changing cell's state
  var state = grid[y*cols + x];

  //find out what cell will change to
  var change = Math.floor(state/2)%2 ? -1 : +1; //-1 -> die, +1 -> birth

  //get bounding box of neighbors
  var right = x+1 < cols ? x+1 : cols-1;
  var top = y-1 >= 0 ? y-1 : 0;
  var left = x-1 >= 0 ? x-1 : 0;
  var bottom = y+1 < rows ? y+1 : rows-1;
  //loop through neighbors, adjust their live neighbor count accordingly, and set to active
  for(var ny = top; ny <= bottom; ny++) {
    for(var nx = left; nx <= right; nx++) {
      //get neighbors state
      var nState = grid[ny*cols + nx] + change*4; //change by 4 to add/subtract live neighbors

      //check if active
      if(nState%2 === 0) {
        //add to active array
        activeCoords[2*activeCells] = nx;
        activeCoords[2*activeCells + 1] = ny;
        activeCells++;

        //set to active
        nState++;
      }

      //set state back into grid
      grid[ny*cols + nx] = nState;
    }
  }

  //toggle current cell
  grid[y*cols + x] -= change*2; //change by 2 to toggle cell live/dead, subtract because we changed by 4 earlier

  return change;
}


//does n generations
function generation(n) {
  n = n ? n : 1;
  for(var i = 0; i < n; i++) {
    //start changing cells at 0
    var changingCells = 0; //cells that are going to change in the current iteration

    //loop through only active cells
    for(var cell = 0; cell < activeCells; cell++) {
      //get coordinates of active cell
      var x = activeCoords[2*cell],
          y = activeCoords[2*cell + 1];

      //get the current active cell's state
      var state = grid[y*cols + x];

      var wasLive = Math.floor(state/2)%2;
      var willLive = (state >= 10 && state <= 15) ? 1 : 0;

      //check if cell is going to change
      if(wasLive ^ willLive) {
        //update active array by overwriting cells that don't change this generation
        activeCoords[2*changingCells] = x;
        activeCoords[2*changingCells + 1] = y;
        changingCells++;
      }
      else {
        //allow cell to get overwritten and remove active state
        grid[y*cols + x] = state - 1;
      }
    }

    //start active cells index after the changing cells to avoid overwriting
    activeCells = changingCells;

    //loop through changing cells
    for(var cell = 0; cell < changingCells; cell++) {
      //get coordinates of cell that will change
      var x = activeCoords[2*cell],
          y = activeCoords[2*cell + 1];

      toggleCell(x, y);

      //add 1 to generation count
      gen++;
    }
  }
}




//draws cell
function drawCell(vx, vy, stroke, fill) {
  if(stroke) {
    ctx.strokeStyle = typeof stroke === 'string' ? stroke : 'gray';
    ctx.lineWidth = .5;
    ctx.strokeRect(vx*tile, vy*tile, tile, tile);
  }
  if(fill) {
    ctx.fillStyle = typeof fill === 'string' ? fill : 'white';
    ctx.fillRect(vx*tile+1, vy*tile+1, tile-2, tile-2);
  }
}

//displays cells on screen based on grid
function display() {
  //clear screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  //only draws active cells (misses still lifes)
  /*
  for(var cell = 0; cell < activeCells; cell++) {
    var x = activeCoords[2*cell];
    var y = activeCoords[2*cell + 1];
    drawCell(x, y, false, Math.floor(grid[y*cols + x]/2)%2);
  }
  //*/

  //loop through all cells and draw
  for(var y = 0; y < rows; y++) {
    for(var x = 0; x < cols; x++) {
      drawCell(x, y, false, Math.floor(grid[y*cols + x]/2)%2);
    }
  }

  //display grid lines if present
  if(gridlines) {
    for(var y = 0; y < rows; y++) {
      for(var x = 0; x < cols; x++) {
        drawCell(x, y, true, false);
      }
    }
  }
}

//animates generations
function life() {
  now = Date.now();
  delta = now - then;

  if (delta > interval) {
    then = now - (delta % interval);

    generation(); //paramater is #generations to do
    display();
  }

  animate = window.requestAnimationFrame(life);
}


//starts animation
function start() {
  playing = true;
  life();
}

//stops animation
function stop() {
  playing = false;
  window.cancelAnimationFrame(animate);
}


//startup
init();





//events
canvas.addEventListener('mousedown', function() {});
canvas.addEventListener('mousemove', function(event) {
  var _x = 0;
  var _y = 0;
  var el = canvas;
  while(el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
      _x += el.offsetLeft - el.scrollLeft;
      _y += el.offsetTop - el.scrollTop;
      el = el.offsetParent;
  }
  mouseX = event.clientX - _x;
  mouseY = event.clientY - _y;
});
canvas.addEventListener('mouseup', function() {
  if(!playing) {
    var vx = Math.floor(mouseX/tile);
    var vy = Math.floor(mouseY/tile);

    var x = vx;
    var y = vy;

    var color = toggleCell(x, y) > 0 ? 'white' : 'black';
    drawCell(vx, vy, color);
    display();
  }
});
window.addEventListener('keydown', function(event) {
  if(keys[event.keyCode]) {
    return;
  }
  keys[event.keyCode] = true;
});
window.addEventListener('keyup', function(event) {
  delete keys[event.keyCode];

  switch(event.keyCode) {
    case 32:
      //spacebar
      playing ? stop() : start();
    break;
    case 67:
      //c
      stop();
      init();
    break;
    case 79:
      //o
      gridlines = gridlines ? false : true;
      display();
    break;
    default:
      return;
  }
});
