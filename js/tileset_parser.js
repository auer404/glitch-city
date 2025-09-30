GC.tileset_parser = {

    canvas: document.querySelector("#analyzer"),
    tileset_src: false,

    init: function () {
        this.canvas.height = GC.options.src_tile_size;
        this.canvas.width = GC.options.src_tile_size;
        this.canvas.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

        this.tileset_src = document.createElement("img");
        this.tileset_src.src = GC.options.tileset_src_path;
        this.tileset_src.addEventListener("load", this.create_map.bind(this));
    },

    create_map: function () {
        if (GC.tileset_map.tiles && GC.tileset_map.tiles.length > 0) { return; }

        GC.tileset_map = {tiles:[], sorted_indexes:[]};

        let rows_in_tileset = this.tileset_src.naturalHeight / GC.options.tile_size;
        let columns_in_tileset = this.tileset_src.naturalWidth / GC.options.tile_size;

        for (let y = 0; y < rows_in_tileset; y++) {
            for (let x = 0; x < columns_in_tileset; x++) {

                let tile = {
                    row: y,
                    column: x,
                    src_x: x * GC.options.src_tile_size,
                    src_y: y * GC.options.src_tile_size
                }

                this.canvas.ctx.fillStyle = "#FFFFFF";
                this.canvas.ctx.fillRect(0, 0, GC.options.src_tile_size, GC.options.src_tile_size);

                this.canvas.ctx.drawImage(
                    this.tileset_src,
                    tile.src_x, tile.src_y,
                    GC.options.src_tile_size, GC.options.src_tile_size,
                    0, 0,
                    GC.options.src_tile_size, GC.options.src_tile_size
                );

                let raw_pixels = this.canvas.ctx.getImageData(0, 0, GC.options.src_tile_size, GC.options.src_tile_size).data;
                let pixels = [];
                let avg_brightness = 0;

                for (let i = 0; i < raw_pixels.length; i += 4) {
                    let pixel = {
                        r: raw_pixels[i], g: raw_pixels[i + 1], b: raw_pixels[i + 2],
                    }
                    pixel.brightness = (pixel.r + pixel.g + pixel.b) / 3;
                    pixels.push(pixel);
                    avg_brightness += pixel.brightness;
                }
                avg_brightness /= pixels.length;

                tile.pixels = pixels;
                tile.average_brightness = avg_brightness;
                GC.tileset_map.tiles.push(tile);
                GC.tileset_map.sorted_indexes.push(GC.tileset_map.tiles.indexOf(tile));

            }
        }

        this.brightness_sort();

        for (let i = 0; i < GC.tileset_map.sorted_indexes.length; i++) {
            if (this.tile_by_id(i - 1)) {
                if (this.same_pixels(this.tile_by_id(i), this.tile_by_id(i - 1))) {
                    this.tile_by_id(i).redundant = true;
                }
            }
        }

        let new_tileset_map = [];
        let new_sorted_tileset = [];

        for (let tile of GC.tileset_map.tiles) {
            if (!tile.redundant) {
                new_tileset_map.push(tile);
                new_sorted_tileset.push(new_tileset_map.indexOf(tile));
            }
        }

        GC.tileset_map.tiles = new_tileset_map;
        GC.tileset_map.sorted_indexes = new_sorted_tileset;

        this.brightness_sort();

        for (tile of GC.tileset_map.tiles) {
            tile.id = GC.tileset_map.sorted_indexes.indexOf(GC.tileset_map.tiles.indexOf(tile));
        }

        this.canvas.remove();

        GC.events.trigger("tilesetMapReady");

        GC.display.init();
        GC.overworld.init();

    },

    brightness_sort: function () {
        GC.tileset_map.sorted_indexes.sort(function (a, b) {
            let brightnessA = GC.tileset_map.tiles[a].average_brightness;
            let brightnessB = GC.tileset_map.tiles[b].average_brightness;

            if (brightnessA < brightnessB) {
                return -1;
            }
            if (brightnessA > brightnessB) {
                return 1;
            }
            return 0;

        });
    },

    same_pixels: function (tile_a, tile_b) {

        for (let i = 0; i < tile_a.pixels.length; i++) {
            let same_r = tile_a.pixels[i].r == tile_b.pixels[i].r;
            let same_g = tile_a.pixels[i].g == tile_b.pixels[i].g;
            let same_b = tile_a.pixels[i].b == tile_b.pixels[i].b;
            if (!same_r || !same_g || !same_b) {
                return false;
            }
        }
        return true;
    },

    tile_by_id: function (sorted_index) {
        return GC.tileset_map.tiles[GC.tileset_map.sorted_indexes[sorted_index]];
    }

}

GC.tileset_map_get = function (sorted_index = false, gap_tolerance = 0) {

    let final_sorted_index = (sorted_index !== false) ? sorted_index : Math.round(Math.random() * GC.tileset_map.tiles.length);

    if (sorted_index !== false) {
        let gap = Math.round(Math.random() * gap_tolerance);
        if (Math.random() > 0.5) {
            gap *= -1;
        }
        final_sorted_index += gap;
    }

    if (final_sorted_index < 0) { final_sorted_index = 0 }
    if (final_sorted_index >= GC.tileset_map.sorted_indexes.length) { final_sorted_index = GC.tileset_map.sorted_indexes.length - 1 }

    return GC.tileset_parser.tile_by_id(final_sorted_index);

}