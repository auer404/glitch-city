GC.display = {
    canvas: document.querySelector("#display"),
    display_offset: {x:0,y:0},

    init: function () {
        this.canvas.width = GC.options.tile_size * GC.options.tile_columns;
        this.canvas.height = GC.options.tile_size * GC.options.tile_rows;
        this.canvas.ctx = this.canvas.getContext("2d");
    },

    draw: function () {

        let display_w = GC.options.tile_columns * GC.options.tile_size;
        let display_h = GC.options.tile_rows * GC.options.tile_size;

        /// X / COLS OFFSET

        let base_col_offset = Math.floor((GC.overworld.columns - GC.options.tile_columns) / 2);
        let base_x_offset = base_col_offset * GC.options.tile_size;

        if (GC.player.current_direction == "ArrowLeft" && this.display_offset.x / display_w == Math.ceil(GC.options.panel_columns / 2)) {
            this.display_offset.x = -1 * display_w * Math.floor(GC.options.panel_columns / 2);
        }

        if (GC.player.current_direction == "ArrowRight" && this.display_offset.x / display_w == -1 * Math.ceil(GC.options.panel_columns / 2)) {
            this.display_offset.x = display_w * Math.floor(GC.options.panel_columns / 2);
        }

        let x_offset = base_x_offset - this.display_offset.x;

        let col_offset = Math.round(x_offset / GC.options.tile_size);

        /// Y / ROWS OFFSET

        let base_row_offset = Math.floor((GC.overworld.rows - GC.options.tile_rows) / 2);
        let base_y_offset = base_row_offset * GC.options.tile_size;

        if (GC.player.current_direction == "ArrowUp" && this.display_offset.y / display_h == Math.ceil(GC.options.panel_rows / 2)) {
            this.display_offset.y = -1 * display_h * Math.floor(GC.options.panel_rows / 2);
        }

        if (GC.player.current_direction == "ArrowDown" && this.display_offset.y / display_h == -1 * Math.ceil(GC.options.panel_rows / 2)) {
            this.display_offset.y = display_h * Math.floor(GC.options.panel_rows / 2);
        }

        let y_offset = base_y_offset - this.display_offset.y;

        let row_offset = Math.round(y_offset / GC.options.tile_size);

        /// WARP TEST - positive result = warped cols / rows to cover

        let x_warped_left = 0 - col_offset;
        let x_warped_right = col_offset - Math.ceil(GC.options.panel_columns / 2) * GC.options.tile_columns;

        let y_warped_top = 0 - row_offset;
        let y_warped_bottom = row_offset - Math.ceil(GC.options.panel_rows / 2) * GC.options.tile_rows;

        /// RENDER

        GC.display.canvas.ctx.fillStyle = "#FFFFFF";
        GC.display.canvas.ctx.fillRect(0, 0, GC.options.tile_size * GC.options.tile_columns, GC.options.tile_size * GC.options.tile_rows);

        for (let tile of GC.overworld.tiles) {

            let x_in_bounds = tile.x >= col_offset - 1 && tile.x <= col_offset + GC.options.tile_columns + 1;
            let y_in_bounds = tile.y >= row_offset - 1 && tile.y <= row_offset + GC.options.tile_rows + 1;

            let dest_x = tile.x * GC.options.tile_size - x_offset;
            let dest_y = tile.y * GC.options.tile_size - y_offset;

            if (x_in_bounds && y_in_bounds) {

                GC.display.canvas.ctx.drawImage(
                    GC.tileset_parser.tileset_src,
                    tile.uses.src_x, tile.uses.src_y,
                    GC.options.src_tile_size, GC.options.src_tile_size,
                    dest_x, dest_y,
                    GC.options.tile_size, GC.options.tile_size
                );

            }

            let x_in_warpzone = false;
            let x_warp_offset = 0;

            if (x_warped_left >= 0) {
                x_in_warpzone = tile.x >= GC.overworld.columns - x_warped_left - 1;
                x_warp_offset = GC.overworld.columns * -1;
            } else if (x_warped_right >= 0) {
                x_in_warpzone = tile.x <= x_warped_right;
                x_warp_offset = GC.overworld.columns;
            }

            let y_in_warpzone = false;
            let y_warp_offset = 0;

            if (y_warped_top >= 0) {
                y_in_warpzone = tile.y >= GC.overworld.rows - y_warped_top - 1;
                y_warp_offset = GC.overworld.rows * -1;
            } else if (y_warped_bottom >= 0) {
                y_in_warpzone = tile.y <= y_warped_bottom;
                y_warp_offset = GC.overworld.rows;
            }

            if (x_in_warpzone) {
                dest_x = (tile.x + x_warp_offset) * GC.options.tile_size - x_offset;

            }

            if (y_in_warpzone) {
                dest_y = (tile.y + y_warp_offset) * GC.options.tile_size - y_offset;
            }

            if (x_in_warpzone || y_in_warpzone) {

                GC.display.canvas.ctx.drawImage(
                    GC.tileset_parser.tileset_src,
                    tile.uses.src_x, tile.uses.src_y,
                    GC.options.src_tile_size, GC.options.src_tile_size,
                    dest_x, dest_y,
                    GC.options.tile_size, GC.options.tile_size
                );

            }

            ///TMP : block debug
            // if (tile.block && ((x_in_bounds && y_in_bounds) || (x_in_warpzone || y_in_warpzone))) {
            //     GC.display.canvas.ctx.fillStyle = "#ff0b0b";
            //     GC.display.canvas.ctx.fillRect(dest_x, dest_y, GC.options.tile_size, GC.options.tile_size);
            // }
        }

        if (!GC.overworld.drawn) {
            GC.overworld.drawn = true;
            GC.player.init();
            GC.events.trigger("overworldFirstDrawn");
        }
        GC.events.trigger("overworldDrawn");

    }
}