(function () {

  var ROWS = 10;
  var COLS = 16;

  var board = document.getElementById("board");
  var statusEl = document.getElementById("status");
  var costEl = document.getElementById("cost");
  var exAEl = document.getElementById("exA");
  var exBEl = document.getElementById("exB");
  var savingEl = document.getElementById("saving");

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var walls = [];
  var start = { r: 4, c: 1 };
  var goal = { r: 4, c: 14 };
  var cursor = { r: 4, c: 1 };
  var mode = "astar";
  var results = { astar: null, blind: null };
  var cells = [];
  var drag = null;
  var timer = null;
  var seenCount = 0;
  var routeCount = 0;

  function emptyWalls() {
    var grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push(new Array(COLS).fill(false));
    }
    return grid;
  }

  function buildBoard() {
    board.innerHTML = "";
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        var el = document.createElement("div");
        el.className = "cell";
        board.appendChild(el);
        row.push(el);
      }
      cells.push(row);
    }
  }

  function setDefaultWalls() {
    walls = emptyWalls();
    for (var r = 3; r <= 6; r++) {
      walls[r][7] = true;
    }
  }

  function same(a, b) {
    return a.r === b.r && a.c === b.c;
  }

  function solve() {
    results.astar = AStar.findPath(walls, start, goal, true);
    results.blind = AStar.findPath(walls, start, goal, false);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function showAll() {
    seenCount = Infinity;
    routeCount = Infinity;
  }

  function render() {
    var run = results[mode];
    var seen = {};
    var route = {};
    var i;

    var seenLimit = Math.min(seenCount, run.expanded.length);
    for (i = 0; i < seenLimit; i++) {
      seen[run.expanded[i].r * COLS + run.expanded[i].c] = true;
    }

    if (run.found) {
      var routeLimit = Math.min(routeCount, run.path.length);
      for (i = 0; i < routeLimit; i++) {
        route[run.path[i].r * COLS + run.path[i].c] = true;
      }
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var key = r * COLS + c;
        var cls = "cell";
        var label = "";

        if (walls[r][c]) {
          cls += " wall";
        } else {
          if (seen[key]) cls += " seen";
          if (route[key]) cls += " route";
        }
        if (r === start.r && c === start.c) {
          cls += " start";
          label = "S";
        }
        if (r === goal.r && c === goal.c) {
          cls += " goal";
          label = "G";
        }
        if (r === cursor.r && c === cursor.c) cls += " cursor";

        cells[r][c].className = cls;
        cells[r][c].textContent = label;
      }
    }
  }

  function updatePanel() {
    var a = results.astar;
    var b = results.blind;

    exAEl.textContent = a.expanded.length;
    exBEl.textContent = b.expanded.length;

    if (a.found) {
      statusEl.textContent = "Cheapest path found: " + a.cost + " steps.";
      statusEl.classList.remove("is-blocked");
      costEl.textContent = a.cost;

      var saved = Math.round(100 * (b.expanded.length - a.expanded.length) / b.expanded.length);
      savingEl.textContent = "The heuristic skipped " + saved + "% of the cells the blind search needed.";
    } else {
      statusEl.textContent = "No path. The goal is walled in. Remove a wall to open a route.";
      statusEl.classList.add("is-blocked");
      costEl.textContent = "-";
      savingEl.textContent = "";
    }
  }

  function update() {
    stopTimer();
    solve();
    showAll();
    render();
    updatePanel();
  }

  function playSearch() {
    stopTimer();
    var run = results[mode];

    if (reducedMotion) {
      showAll();
      render();
      return;
    }

    seenCount = 0;
    routeCount = 0;
    render();

    var step = Math.max(1, Math.ceil(run.expanded.length / 70));

    timer = setInterval(function () {
      if (seenCount < run.expanded.length) {
        seenCount = Math.min(run.expanded.length, seenCount + step);
      } else if (routeCount < run.path.length) {
        routeCount++;
      } else {
        stopTimer();
      }
      render();
    }, 24);
  }

  function cellFromEvent(e) {
    var rect = board.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var c = Math.floor((e.clientX - rect.left) / rect.width * COLS);
    var r = Math.floor((e.clientY - rect.top) / rect.height * ROWS);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r: r, c: c };
  }

  function applyDrag(cell) {
    if (!drag || !cell) return;
    cursor = { r: cell.r, c: cell.c };

    if (drag.type === "wall") {
      if (same(cell, start) || same(cell, goal)) return;
      if (walls[cell.r][cell.c] !== drag.paint) {
        walls[cell.r][cell.c] = drag.paint;
        update();
      } else {
        render();
      }
    } else if (drag.type === "start") {
      if (walls[cell.r][cell.c] || same(cell, goal) || same(cell, start)) return;
      start = { r: cell.r, c: cell.c };
      update();
    } else if (drag.type === "goal") {
      if (walls[cell.r][cell.c] || same(cell, start) || same(cell, goal)) return;
      goal = { r: cell.r, c: cell.c };
      update();
    }
  }

  board.addEventListener("pointerdown", function (e) {
    var cell = cellFromEvent(e);
    if (!cell) return;
    e.preventDefault();

    if (board.setPointerCapture) {
      try { board.setPointerCapture(e.pointerId); } catch (err) {}
    }
    board.focus({ preventScroll: true });

    if (same(cell, start)) {
      drag = { type: "start" };
    } else if (same(cell, goal)) {
      drag = { type: "goal" };
    } else {
      drag = { type: "wall", paint: !walls[cell.r][cell.c] };
    }
    applyDrag(cell);
  });

  board.addEventListener("pointermove", function (e) {
    if (drag) applyDrag(cellFromEvent(e));
  });

  function endDrag() {
    drag = null;
  }

  board.addEventListener("pointerup", endDrag);
  board.addEventListener("pointercancel", endDrag);

  board.addEventListener("keydown", function (e) {
    var key = e.key;
    var moved = true;

    if (key === "ArrowUp") cursor.r = Math.max(0, cursor.r - 1);
    else if (key === "ArrowDown") cursor.r = Math.min(ROWS - 1, cursor.r + 1);
    else if (key === "ArrowLeft") cursor.c = Math.max(0, cursor.c - 1);
    else if (key === "ArrowRight") cursor.c = Math.min(COLS - 1, cursor.c + 1);
    else moved = false;

    if (moved) {
      e.preventDefault();
      render();
      return;
    }

    if (key === " " || key === "Enter") {
      e.preventDefault();
      if (!same(cursor, start) && !same(cursor, goal)) {
        walls[cursor.r][cursor.c] = !walls[cursor.r][cursor.c];
        update();
      }
    } else if (key === "s" || key === "S") {
      if (!walls[cursor.r][cursor.c] && !same(cursor, goal)) {
        start = { r: cursor.r, c: cursor.c };
        update();
      }
    } else if (key === "g" || key === "G") {
      if (!walls[cursor.r][cursor.c] && !same(cursor, start)) {
        goal = { r: cursor.r, c: cursor.c };
        update();
      }
    }
  });

  document.getElementById("replay").addEventListener("click", playSearch);

  document.getElementById("clear").addEventListener("click", function () {
    walls = emptyWalls();
    update();
  });

  document.getElementById("random").addEventListener("click", function () {
    for (var attempt = 0; attempt < 40; attempt++) {
      walls = emptyWalls();
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var cell = { r: r, c: c };
          if (!same(cell, start) && !same(cell, goal) && Math.random() < 0.28) {
            walls[r][c] = true;
          }
        }
      }
      if (AStar.findPath(walls, start, goal, true).found) break;
    }
    update();
  });

  var radios = document.querySelectorAll('input[name="mode"]');
  for (var i = 0; i < radios.length; i++) {
    radios[i].addEventListener("change", function (e) {
      mode = e.target.value;
      playSearch();
    });
  }

  buildBoard();
  setDefaultWalls();
  update();
  playSearch();

})();
