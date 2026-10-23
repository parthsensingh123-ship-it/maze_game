(function () {

  function createQueue() {
    var q = [];
    var size = 0;

    function compare(a, b) {
      return a.f - b.f;
    }

    function siftUp(k, x) {
      while (k > 0) {
        var parent = (k - 1) >>> 1;
        var e = q[parent];
        if (compare(x, e) >= 0) break;
        q[k] = e;
        k = parent;
      }
      q[k] = x;
    }

    function siftDown(k, x, n) {
      var half = n >>> 1;
      while (k < half) {
        var child = 2 * k + 1;
        var c = q[child];
        var right = child + 1;
        if (right < n && compare(c, q[right]) > 0) {
          child = right;
          c = q[child];
        }
        if (compare(x, c) <= 0) break;
        q[k] = c;
        k = child;
      }
      q[k] = x;
    }

    return {
      add: function (x) {
        q[size] = x;
        siftUp(size, x);
        size++;
      },
      poll: function () {
        var result = q[0];
        size--;
        var x = q[size];
        q.length = size;
        if (size > 0) siftDown(0, x, size);
        return result;
      },
      isEmpty: function () {
        return size === 0;
      }
    };
  }

  function findPath(walls, start, goal, useHeuristic) {
    var rows = walls.length;
    var cols = walls[0].length;
    var dr = [-1, 1, 0, 0];
    var dc = [0, 0, -1, 1];
    var closed = [];
    var expanded = [];

    for (var r = 0; r < rows; r++) {
      closed.push(new Array(cols).fill(false));
    }

    function heuristic(row, col) {
      if (!useHeuristic) return 0;
      return Math.abs(row - goal.r) + Math.abs(col - goal.c);
    }

    var open = createQueue();
    open.add({ r: start.r, c: start.c, g: 0, f: heuristic(start.r, start.c), parent: null });

    while (!open.isEmpty()) {
      var current = open.poll();

      if (closed[current.r][current.c]) continue;
      closed[current.r][current.c] = true;
      expanded.push({ r: current.r, c: current.c });

      if (current.r === goal.r && current.c === goal.c) {
        var path = [];
        for (var n = current; n; n = n.parent) {
          path.push({ r: n.r, c: n.c });
        }
        path.reverse();
        return { found: true, cost: current.g, path: path, expanded: expanded };
      }

      for (var k = 0; k < 4; k++) {
        var nr = current.r + dr[k];
        var nc = current.c + dc[k];

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (walls[nr][nc]) continue;
        if (closed[nr][nc]) continue;

        var g = current.g + 1;
        var f = g + heuristic(nr, nc);
        open.add({ r: nr, c: nc, g: g, f: f, parent: current });
      }
    }

    return { found: false, cost: null, path: [], expanded: expanded };
  }

  var AStar = { findPath: findPath };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = AStar;
  } else {
    window.AStar = AStar;
  }

})();
