GC.overworld = {
    tiles: [],
    xy: [],
    columns: 0,
    rows: 0,
    tiles_set: 0,
    drawn: false,

    tile: function (x, y) {
        return this.tiles[this.xy[y][x]];
    },

    set_pattern: function (x, y, propagate = false, tile_id = GC.options.initial_tile_id, tolerance = GC.options.initial_gap_tolerance) {

        let ow_tile = GC.overworld.tile(x, y);

        if (ow_tile.uses) { return; }

        ow_tile.uses = GC.tileset_map_get(tile_id, tolerance);

        if (Math.random() * 100 <= GC.options.block_probability) {
            ow_tile.block = true;
        }

        this.tiles_set++;

        if (propagate) {
            setTimeout(function () {
                for (n of ow_tile.neighbors) {
                    GC.overworld.set_pattern(n.x, n.y, true, ow_tile.uses.id, tolerance);
                }
            }.bind(this), 1);
        }

        GC.preloader.task_done();

        GC.events.trigger("overworldTileReady", ow_tile);

        if (this.tiles_set >= this.tiles.length) {
            GC.events.trigger("overworldReady", this);
        }

    },

    init: function () {

        this.columns = GC.options.tile_columns * GC.options.panel_columns;
        this.rows = GC.options.tile_rows * GC.options.panel_rows;

        GC.events.trigger("overworldSized", this);

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {

                let tile = {
                    x: x,
                    y: y,
                    uses: false,
                    block: false,
                    neighbors: []
                };

                this.tiles.push(tile);
                if (!this.xy[y]) {
                    this.xy[y] = [];
                }
                this.xy[y][x] = this.tiles.indexOf(tile);
            }
        }

        for (let tile of this.tiles) {

            let prev_x = (tile.x - 1 >= 0) ? tile.x - 1 : this.columns - 1;
            let prev_y = (tile.y - 1 >= 0) ? tile.y - 1 : this.rows - 1;
            let next_x = (tile.x + 1 < this.columns) ? tile.x + 1 : 0;
            let next_y = (tile.y + 1 < this.rows) ? tile.y + 1 : 0;

            tile.neighbors = [
                GC.overworld.tile(tile.x, prev_y),
                GC.overworld.tile(tile.x, next_y),
                GC.overworld.tile(prev_x, tile.y),
                GC.overworld.tile(next_x, tile.y)
            ];

        }

        GC.preloader.register(this.tiles.length, GC.game.ready === undefined);

        GC.overworld.set_pattern(0, 0, true);

    }

};

window.addEventListener("load", function () {
    GC.events.add("tilesetMapReady", function () {
        GC.overworld.init();
    });
});