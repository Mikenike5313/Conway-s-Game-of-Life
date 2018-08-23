//controls
var controls = document.getElementById("controls");

// canvas
var canvas = document.getElementById('universe');
canvas.height = canvas.offsetHeight;
canvas.width = canvas.offsetWidth;

var ctx = canvas.getContext('2d');


//keyboard & mouse
var keys = {};
var mouseDown = false;


//drawing
var poisoned = false;
var drawn = [];


//grid
var ogTile = 10;
var tile = ogTile; //this is used to determine size of universe
var step = tile >= 4 ? 1 : 5-tile;

var gridlines = false;
var mapMode = 'infinite';


var vRows = Math.floor(canvas.height/tile);
var vCols = Math.floor(canvas.width/tile);

var scrolls = 1;
var sRows = mapMode === 'toroidal' ? vRows : vRows*(2*scrolls + 1);
var sCols = mapMode === 'toroidal' ? vCols : vCols*(2*scrolls + 1);
var scrollX = mapMode === 'toroidal' ? 0 : vCols*scrolls;
var scrollY = mapMode === 'toroidal' ? 0 : vRows*scrolls;

var excess = mapMode === 'infinite' ? 1 : 0;
var e = 50;

var rows = 2*excess*e + sRows;
var cols = 2*excess*e + sCols;

var grid = [];
var past = [];


//pattern converting/drawing/saving
var convertData;
var pattern;
var xc = 0,
    yr = 0;
var corner = 0;
    sc0 = null,
    sr0 = null,
    sc1 = null,
    sr1 = null;


//animations
var gen = 0;
var play = false;

var fps = 5;
var interval = 1000/fps;

var animate;
var now;
var then = Date.now();
var delta;

var slide;
var dir;


//display
function drawTile(vr, vc, fill, stroke) {
  ctx.fillStyle = fill ? fill : 'white';
  if(tile >= 4) {
    if(gridlines) {
      ctx.strokeStyle = stroke ? stroke : 'gray';
      ctx.strokeRect(vc*tile, vr*tile, tile, tile);
    }
    ctx.fillRect(vc*tile+1, vr*tile+1, tile-2, tile-2);
    return;
  }
  ctx.fillRect(vc*tile, vr*tile, tile, tile);
}

function drawPattern(vr, vc, pattern, fill, stroke) {
  for(var pr = 0; pr < pattern.length; pr++) {
    for(var pc = 0; pc < pattern[pr].length; pc++) {
      grid[e*excess + scrollY + vr + pr][e*excess + scrollX + vc + pc] = pattern[pr][pc];
      pattern[pr][pc] ? drawTile(vr + pr, vc + pc, fill) : drawTile(vr + pr, vc + pc, 'black');
    }
  }
}

function display() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for(var vr = 0; vr < vRows; vr++) {
    for(var vc = 0; vc < vCols; vc++) {
      if(!grid[excess*e + scrollY + vr][excess*e + scrollX + vc]) {
        if(gridlines && tile >= 4) {
          ctx.strokeStyle = 'gray';
          ctx.strokeRect(vc*tile, vr*tile, tile, tile);
        }
        continue;
      }
      drawTile(vr, vc, 'white');
    }
  }
}


//logic
function init() {
  grid = [];
  past = [];
  for(var r = 0; r < rows; r++) {
    grid.push([]);
    past.push([]);
    for(var c = 0; c < cols; c++) {
      grid[r][c] = 0;
      past[r][c] = 0;
    }
  }
  display();
  console.log('Init complete.');
}

function neighbors(r, c, map) {
  var liveNeighbors = 0;

  if(mapMode === 'toroidal') {
    var up = map[r-1] === undefined ? rows-1 : r-1;
    var right = map[r][c+1] === undefined ? 0 : c+1;
    var down = map[r+1] === undefined ? 0 : r+1;
    var left = map[r][c-1] === undefined ? cols-1 : c-1;

    liveNeighbors = map[up][left] + map[up][c] + map[up][right] + map[r][right] + map[down][right] + map[down][c] + map[down][left] + map[r][left];
  }

  if(mapMode === 'infinite') {
    if(r === 0 && c === 0) {
      //top left
      liveNeighbors = map[r][c+1] + map[r+1][c+1] + map[r+1][c];
    }
    else if(r === 0 && c === cols-1) {
      //top right
      liveNeighbors = map[r][c-1] + map[r+1][c-1] + map[r+1][c];
    }
    else if(r === rows-1 && c === 0) {
      //bottom left
      liveNeighbors = map[r-1][c] + map[r-1][c+1] + map[r][c+1];
    }
    else if(r === rows-1 && c === cols-1) {
      //bottom right
      liveNeighbors = map[r-1][c] + map[r-1][c-1] + map[r][c-1];
    }
    else if(r === 0) {
      //top
      liveNeighbors = map[r][c-1] + map[r+1][c-1] + map[r+1][c] + map[r+1][c+1] + map[r][c+1];
    }
    else if(r === rows-1) {
      //bottom
      liveNeighbors = map[r][c-1] + map[r-1][c-1] + map[r-1][c] + map[r-1][c+1] + map[r][c+1];
    }
    else if(c === 0) {
      //left
      liveNeighbors = map[r-1][c] + map[r-1][c+1] + map[r][c+1] + map[r+1][c+1] + map[r+1][c];
    }
    else if(c === cols-1) {
      //right
      liveNeighbors = map[r-1][c] + map[r-1][c-1] + map[r][c-1] + map[r+1][c-1] + map[r+1][c];
    }
    else {
      //middle
      liveNeighbors = map[r-1][c-1] + map[r-1][c] + map[r-1][c+1] + map[r][c+1] + map[r+1][c+1] + map[r+1][c] + map[r+1][c-1] + map[r][c-1];
    }
  }

  return liveNeighbors;
}

function decide(r, c) {
  var liveNeighbors = neighbors(r, c, grid);

  // if dead
  if(!grid[r][c]) {
    if(liveNeighbors === 3) {
      //reproduction
      return 1;
    }
    //nothing happens
    return 0;
  }

  //if alive
  if(liveNeighbors < 2) {
    //underpopulation
    return 0;
  }
  if(liveNeighbors <= 3) {
    //nothing happens
    return 1;
  }
  if(liveNeighbors > 3) {
    //overpopulation
    return 0;
  }
}

function life() {
  now = Date.now();
  delta = now - then;
  if (delta > interval) {
    then = now - (delta % interval);

    var next = [];
    for(var r = 0; r < rows; r++) {
      next.push([]);
      for(var c = 0; c < cols; c++) {
        next[r][c] = (past[r][c] !== grid[r][c] || neighbors(r, c, past) !== neighbors(r, c, grid)) ? decide(r, c) : grid[r][c];
      }
    }
    gen++;

    past = grid;
    grid = next;
    display();
  }
  animate = window.requestAnimationFrame(life);
}


//controls & ui
function start() {
  console.log('Resuming...');
  play = true;
  life();
}
function stop() {
  console.log('Pausing at generation ' + gen + '...');
  play = false;
  window.cancelAnimationFrame(animate);
}

function pan() {
  switch(dir) {
    case 'left':
      scrollX = scrollX <= step ? 0 : scrollX-step;
      display();
    break;
    case 'up':
      scrollY = scrollY <= step ? 0 : scrollY-step;
      display();
    break;
    case 'right':
      scrollX = scrollX + vCols >= sCols-step ? sCols-vCols : scrollX+step;
      display();
    break;
    case 'down':
      scrollY = scrollY + vRows >= sRows-step ? sRows-vRows : scrollY+step;
      display();
    break;
    default:
      console.log('Not a valid direction');
  }

  if(keys['37'] || keys['38'] || keys['39'] || keys['40']) {
    slider = window.requestAnimationFrame(pan);
  }
}

function adjust(prevMM) {
  if(prevMM && prevMM !== 'infinite' && mapMode === 'infinite') {
    for(var r = 0; r < e*excess; r++) {
      grid.unshift([]);
      for(var c = 0; c < cols; c++) {
        grid[r][c] = 0;
      }
    }
    for(var r = e*excess; r < rows; r++) {
      if(grid[r] === undefined) {
        grid.push([]);
      }
      for(var c = 0; c < e*excess; c++) {
        grid[r].unshift(0);
      }
      for(var c = grid[r].length; c < cols; c++) {
        grid[r][c] = 0;
      }
    }
  }
  else if(prevMM && prevMM === 'infinite' && mapMode !== 'infinite') {
    grid.splice(0, e);
    for(var r = 0; r < rows; r++) {
      grid[r].splice(0, e);
    }
  }
  else {
    for(var r = 0; r < rows; r++) {
      if(grid[r] === undefined) {
        grid.push([]);
      }
      for(var c = grid[r].length; c < cols; c++) {
        grid[r][c] = 0;
      }
    }
  }
  past = [];
  for(var r = 0; r < rows; r++) {
    past.push([]);
    for(var c = 0; c < cols; c++) {
      past[r][c] = 0;
    }
  }
  display();
  console.log('Adjustment complete.');
}

function draw(event) {
  var _x = 0;
  var _y = 0;
  var el = canvas;
  while(el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
      _x += el.offsetLeft - el.scrollLeft;
      _y += el.offsetTop - el.scrollTop;
      el = el.offsetParent;
  }

  var mouseX = event.clientX - _x;
  var mouseY = event.clientY - _y;

  var vr = Math.floor(mouseY/tile);
  var vc = Math.floor(mouseX/tile);

  var r = excess*e + scrollY + vr;
  var c = excess*e + scrollX + vc;

  var cell = r*cols + c;
  if(drawn.indexOf(cell) !== -1) {
    return;
  }
  drawn.push(cell);

  grid[r][c] = poisoned ? 0 : 1;
  color = grid[r][c] ? 'white' : 'black';
  drawTile(vr, vc, color);
}

//events
canvas.addEventListener('contextmenu', function(event) {
  mouseDown = false;
  event.preventDefault();

  var _x = 0;
  var _y = 0;
  var el = canvas;
  while(el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
      _x += el.offsetLeft - el.scrollLeft;
      _y += el.offsetTop - el.scrollTop;
      el = el.offsetParent;
  }

  var mouseX = event.clientX - _x;
  var mouseY = event.clientY - _y;
  var vr = Math.floor(mouseY/tile);
  var vc = Math.floor(mouseX/tile);
  var r = excess*e + scrollY + vr;
  var c = excess*e + scrollX + vc;

  if(!corner) {
    sc0 = c;
    sr0 = r;
    corner = 1;
    return;
  }
  sc1 = c;
  sr1 = r;
  corner = 0;
});
canvas.addEventListener('mousedown', function(event) {
  mouseDown = true;
  if(!play) {
    draw(event);
  }
});
canvas.addEventListener('mousemove', function(event) {
  if(!play && mouseDown) {
    draw(event);
  }
});
window.addEventListener('mouseup', function() {
  mouseDown = false;
  drawn = [];
});
window.addEventListener('keydown', function(event) {
  if(keys[event.keyCode]) {
    return;
  }

  keys[event.keyCode] = true;

  switch(event.keyCode) {
    case 37:
      dir = 'left';
    break;
    case 38:
      dir = 'up';
    break;
    case 39:
      dir = 'right';
    break;
    case 40:
      dir = 'down';
    break;
    default:
      return;
  }
  pan();
});
window.addEventListener('keyup', function(event) {
  delete keys[event.keyCode];

  switch(event.keyCode) {
    case 32:
      //spacebar
      play ? stop() : start();
    break;
    case 37:
    case 38:
    case 39:
    case 40:
      window.cancelAnimationFrame(slide);
    break;
    case 67:
      //c
      stop();
      init();
    break;
    case 69:
      //e
      poisoned = poisoned ? false : true;
    break;
    case 79:
      //o
      gridlines = gridlines ? false : true;
      display();
    break;
    case 80:
      //p
      stop();

      pattern = patterns;

      while(!Array.isArray(pattern)) {
        var groups = Object.keys(pattern);
        var choices = '';
        for(var g = 0; g < groups.length; g++) {
          choices += '- ' + groups[g] + '\n';
        }
        choice = prompt('Choose:\n\n' + choices);
        if(!choice) {
          return;
        }
        pattern = pattern[choice];
      }

      var xChoice = parseInt(prompt('x pos?'));
      var yChoice = parseInt(prompt('y pos?'));

      xc = xChoice ? Math.min(Math.max(xChoice, 0), vCols-pattern[0].length) : 0;
      yr = yChoice ? Math.min(Math.max(yChoice, 0), vRows-pattern.length) : 0;

      drawPattern(yr, xc, pattern);
    break;
    case 83:
      //s
      if(sc0 !== null && sr0 !== null && sc1 !== null && sr1 !== null) {
        var snip = [];
        for(var i = 0; i <= Math.abs(sr1-sr0); i++) {
          snip.push([]);
          for(var j = 0; j <= Math.abs(sc1-sc0); j++) {
            snip[i][j] = grid[i*(sr1-sr0)/Math.abs(sr1-sr0) + sr0][j*(sc1-sc0)/Math.abs(sc1-sc0) + sc0];
          }
        }
        var name = prompt('What would you like to save snip as?') || 'temporary';
        patterns.snips[name] = snip;
      }
    break;
    case 84:
      if(convertData) {
        var convertPattern = convert(convertData, '\n', '.');
        var name = prompt('What would you like to save pattern as?') || 'temporary';
        patterns.converts[name] = convertPattern;
      }
    break;
    default:
      return;
  }
});
window.onresize = function() {
  stop();

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;


  //resize universe here (could get laggy if they have a massive screen)
  vRows = Math.floor(canvas.height/tile);
  vCols = Math.floor(canvas.width/tile);

  if(mapMode === 'toroidal') {
    sRows = vRows;
    sCols = vCols;
    scrollX = 0;
    scrollY = 0;
  }
  else {
    sRows = vRows*(2*scrolls + 1);
    sCols = vCols*(2*scrolls + 1);
    scrollX = scrollX + vCols >= sCols ? sCols-vCols : vCols*scrolls;
    scrollY = scrollY + vRows >= sRows ? sRows-vRows : vRows*scrolls;
  }

  rows = 2*excess*e + sRows;
  cols = 2*excess*e + sCols;

  adjust();

  display();
}

function update() {
  var prevMM = mapMode;
  mapMode = controls.querySelector('#mapMode > \:checked').value;

  var prevTile = tile;
  tile = controls.querySelector('#zoom > input').value; //could resize universe with this but don't to prevent lag
  step = tile >= 4 ? 1 : 5-tile;

  fps = controls.querySelector('#fps > input').value;
  interval = 1000/fps;

  convertData = controls.querySelector('#convertData').value.replace(/[\t]/g, '');

  var prevVRows = vRows;
  var prevVCols = vCols;
  vRows = Math.floor(canvas.height/tile);
  vCols = Math.floor(canvas.width/tile);

  scrollX = mapMode === 'toroidal' ? 0 : (prevMM === 'toroidal' ? vCols*scrolls : scrollX+Math.floor((prevVCols-vCols)/2));
  scrollY = mapMode === 'toroidal' ? 0 : (prevMM === 'toroidal' ? vRows*scrolls : scrollY+Math.floor((prevVRows-vRows)/2));
  scrollX = scrollX <= 0 ? 0 : scrollX;
  scrollY = scrollY <= 0 ? 0 : scrollY;
  scrollX = scrollX + vCols >= sCols ? sCols-vCols : scrollX;
  scrollY = scrollY + vRows >= sRows ? sRows-vRows : scrollY;

  sRows = mapMode === 'toroidal' ? vRows : Math.floor(canvas.height/ogTile)*(2*scrolls + 1);
  sCols = mapMode === 'toroidal' ? vCols : Math.floor(canvas.width/ogTile)*(2*scrolls + 1);

  excess = mapMode === 'infinite' ? 1 : 0;

  rows = mapMode === 'toroidal' ? sRows : 2*excess*e + sRows;
  cols = mapMode === 'toroidal' ? sCols : 2*excess*e + sCols;

  adjust(prevMM);
}

//startup
init();
