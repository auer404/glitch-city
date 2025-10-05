GC.display = {
    canvas: document.querySelector("#display"),
    base_offset: {x:0,y:0},
    ow_position: {x:0,y:0},
    offset: {x:0,y:0,cols:0,rows:0},
    pixel_w:0,
    pixel_h:0,

    init: function () {

        this.pixel_w = GC.options.tile_columns * GC.options.tile_size;
        this.pixel_h = GC.options.tile_rows * GC.options.tile_size;

        this.canvas.width = this.pixel_w;
        this.canvas.height = this.pixel_h;
        this.canvas.ctx = this.canvas.getContext("2d");
        this.base_offset.x = Math.floor((GC.overworld.columns - GC.options.tile_columns) / 2) * GC.options.tile_size;
        this.base_offset.y = Math.floor((GC.overworld.rows - GC.options.tile_rows) / 2) * GC.options.tile_size;

    },

    handle_warp: function() {

        if (GC.player.current_direction == "ArrowLeft" && this.ow_position.x / this.pixel_w == Math.ceil(GC.options.panel_columns / 2)) {
            this.ow_position.x = -1 * this.pixel_w * Math.floor(GC.options.panel_columns / 2);
        }

        if (GC.player.current_direction == "ArrowRight" && this.ow_position.x / this.pixel_w == -1 * Math.ceil(GC.options.panel_columns / 2)) {
            this.ow_position.x = this.pixel_w * Math.floor(GC.options.panel_columns / 2);
        }

        this.offset.x = this.base_offset.x - this.ow_position.x;
        this.offset.cols = Math.round(this.offset.x / GC.options.tile_size);

        if (GC.player.current_direction == "ArrowUp" && this.ow_position.y / this.pixel_h == Math.ceil(GC.options.panel_rows / 2)) {
            this.ow_position.y = -1 * this.pixel_h * Math.floor(GC.options.panel_rows / 2);
        }

        if (GC.player.current_direction == "ArrowDown" && this.ow_position.y / this.pixel_h == -1 * Math.ceil(GC.options.panel_rows / 2)) {
            this.ow_position.y = this.pixel_h * Math.floor(GC.options.panel_rows / 2);
        }

        this.offset.y = this.base_offset.y - this.ow_position.y;
        this.offset.rows = Math.round(this.offset.y / GC.options.tile_size);

    },

    clear: function() {

        GC.display.canvas.ctx.fillStyle = "#FFFFFF";
        GC.display.canvas.ctx.fillRect(0, 0, GC.options.tile_size * GC.options.tile_columns, GC.options.tile_size * GC.options.tile_rows);
    },

    draw: function() {

        this.handle_warp();

        this.clear();

        for (let disp_y = -1; disp_y <= GC.options.tile_rows; disp_y++) {
            for (let disp_x = -1; disp_x <= GC.options.tile_columns; disp_x++) {

                let src_x = disp_x + this.offset.cols;
                let src_y = disp_y + this.offset.rows;

                let x_correction = 0, y_correction = 0;

                while (src_x < 0) {
                    src_x += GC.overworld.columns;
                    x_correction += GC.overworld.columns * GC.options.tile_size;
                } 
                while (src_x > GC.overworld.columns - 1) {
                    src_x -= GC.overworld.columns;
                    x_correction -= GC.overworld.columns * GC.options.tile_size;
                }
                while (src_y < 0) {
                    src_y += GC.overworld.rows;
                    y_correction += GC.overworld.rows * GC.options.tile_size;
                } 
                while (src_y > GC.overworld.rows - 1) {
                    src_y -= GC.overworld.rows;
                    y_correction -= GC.overworld.rows * GC.options.tile_size;
                }

                let tile = GC.overworld.tile(src_x,src_y);

                let dest_x = tile.x * GC.options.tile_size - this.offset.x - x_correction;
                let dest_y = tile.y * GC.options.tile_size - this.offset.y - y_correction;

                GC.display.canvas.ctx.drawImage(
                    GC.tileset_parser.tileset_src,
                    tile.uses.src_x, tile.uses.src_y,
                    GC.options.src_tile_size, GC.options.src_tile_size,
                    dest_x, dest_y,
                    GC.options.tile_size, GC.options.tile_size
                );

                // //TMP : block debug
                // if (tile.block) {
                //     GC.display.canvas.ctx.fillStyle = "#ff0b0b";
                //     GC.display.canvas.ctx.fillRect(dest_x, dest_y, GC.options.tile_size, GC.options.tile_size);
                // }

            }
        }

        if (!GC.overworld.drawn) {
            GC.overworld.drawn = true;
            GC.events.trigger("overworldFirstDrawn", GC.overworld);
        }
        GC.events.trigger("overworldDrawn", GC.overworld);

    }
}

window.addEventListener("load",function(){
    GC.events.add("overworldReady",function(){
        GC.display.init();
        GC.display.draw();
    });
});