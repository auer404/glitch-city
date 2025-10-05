GC.tileset_parser = {

    canvas: false,
    tileset_src: false,

    init: function () {

        this.canvas = document.createElement("canvas");
        this.canvas.style.display = "none";
        document.body.appendChild(this.canvas);

        this.canvas.height = GC.options.src_tile_size;
        this.canvas.width = GC.options.src_tile_size;
        this.canvas.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

        this.tileset_src = document.createElement("img");
        this.tileset_src.src = GC.options.tileset_src_path;
        this.tileset_src.addEventListener("load", this.create_map.bind(this));
    },

    create_map: function () {
        if (GC.tileset_map.tiles && GC.tileset_map.tiles.length > 0) { return; }

        GC.tileset_map = {
            tiles: [],
            sorted_indexes: [],
            rows: this.tileset_src.naturalHeight / GC.options.tile_size,
            columns: this.tileset_src.naturalWidth / GC.options.tile_size
        };

        for (let y = 0; y < GC.tileset_map.rows; y++) {
            for (let x = 0; x < GC.tileset_map.columns; x++) {

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

            }
        }

        GC.preloader.register(GC.tileset_map.tiles.length, GC.overworld.drawn === undefined);

        for (let i = 0; i < GC.tileset_map.tiles.length; i++) {
            for (let d = 1; d <= i; d++) {
                if (GC.tileset_map.tiles[i - d]) {
                    if (this.same_pixels(GC.tileset_map.tiles[i], GC.tileset_map.tiles[i - d])) {
                        GC.tileset_map.tiles[i].redundant = true;
                    }
                }
            }
            GC.preloader.task_done();
        }

        let new_tileset_map = [];

        for (let tile of GC.tileset_map.tiles) {
            if (!tile.redundant) {
                new_tileset_map.push(tile);
                GC.tileset_map.sorted_indexes.push(new_tileset_map.indexOf(tile));
            }
        }

        GC.tileset_map.tiles = new_tileset_map;
        this.brightness_sort();

        for (tile of GC.tileset_map.tiles) {
            tile.id = GC.tileset_map.sorted_indexes.indexOf(GC.tileset_map.tiles.indexOf(tile));
        }

        this.canvas.remove();

        GC.events.trigger("tilesetMapReady", GC.tileset_map);

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

    same_pixels_flipped: function (tile_a, tile_b, verbose = false) {

        let pixels_a_2d = GC.tools.array_2d(tile_a.pixels);

        let b_flipped_x = GC.tools.array_flip(GC.tools.array_2d(tile_b.pixels), "x");
        let b_flipped_y = GC.tools.array_flip(GC.tools.array_2d(tile_b.pixels), "y");

        let same_x = true, same_y = true;

        for (let y = 0; y < GC.options.tile_size; y++) {
            for (let x = 0; x < GC.options.tile_size; x++) {
                let x_same_r = pixels_a_2d[y][x].r == b_flipped_x[y][x].r;
                let x_same_g = pixels_a_2d[y][x].g == b_flipped_x[y][x].g;
                let x_same_b = pixels_a_2d[y][x].b == b_flipped_x[y][x].b;
                let y_same_r = pixels_a_2d[y][x].r == b_flipped_y[y][x].r;
                let y_same_g = pixels_a_2d[y][x].g == b_flipped_y[y][x].g;
                let y_same_b = pixels_a_2d[y][x].b == b_flipped_y[y][x].b;
                if (!x_same_r || !x_same_g || !x_same_b) {
                    same_x = false;
                }
                if (!y_same_r || !y_same_g || !y_same_b) {
                    same_y = false;
                }
            }
        }
        if (!verbose) {
            return same_x || same_y;
        } else {
            return { x: same_x, y: same_y }
        }
    },

    same_pixels_rotated: function (tile_a, tile_b, verbose = false) {

        let pixels_a_2d = GC.tools.array_2d(tile_a.pixels);
        let pixels_b_2d = GC.tools.array_2d(tile_b.pixels);

        let a_rotated = pixels_a_2d;

        let count = 0;
        let results = [];

        while (count < 3) {

            a_rotated = GC.tools.array_rotate(a_rotated);

            let same = true;

            for (let y = 0; y < GC.options.tile_size; y++) {
                for (let x = 0; x < GC.options.tile_size; x++) {
                    let same_r = a_rotated[y][x].r == pixels_b_2d[y][x].r;
                    let same_g = a_rotated[y][x].g == pixels_b_2d[y][x].g;
                    let same_b = a_rotated[y][x].b == pixels_b_2d[y][x].b;
                    if (!same_r || !same_g || !same_b) {
                        same = false;
                    }
                }
            }
            results.push(same);
            count++;
        }
        if (!verbose) {
            return results.includes(true);
        } else {
            return results.indexOf(true) + 1 || false;
        }
        
    },

    similarity: function (tile_a, tile_b) {

        let similar_found = 0;

        for (let i = 0; i < tile_a.pixels.length; i++) {
            let same_r = tile_a.pixels[i].r == tile_b.pixels[i].r;
            let same_g = tile_a.pixels[i].g == tile_b.pixels[i].g;
            let same_b = tile_a.pixels[i].b == tile_b.pixels[i].b;
            if (same_r && same_g && same_b) {
                similar_found++;
            }
        }
        return similar_found / tile_a.pixels.length;
    },

    share_patterns: function (tile_a, tile_b, definition) {

        let pixels_a_2d = GC.tools.array_2d(tile_a.pixels);
        let pixels_b_2d = GC.tools.array_2d(tile_b.pixels);

        // SCAN : GC.tools.array_fragment(arr, w, h, offset_x, offset_y)

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

GC.tools.array_2d = function (arr) {
    let dim = Math.sqrt(arr.length);
    let formatted = [];
    let src_i = 0;
    for (let y = 0; y < dim; y++) {
        if (!formatted[y]) { formatted[y] = [] }
        for (let x = 0; x < dim; x++) {
            formatted[y][x] = arr[src_i];
            src_i++;
        }
    }
    return formatted;
}

GC.tools.array_flip = function (arr, axis) {

    if (axis == "y") {
        return arr.toReversed();
    } else if (axis == "x") {
        let flipped = [];
        for (let y of arr) {
            flipped.push(y.toReversed());
        }
        return flipped;
    }
    return [];
}

GC.tools.array_rotate = function (arr, rotations = 1) {

    let rotations_count = 0;

    let base = arr;

    while (rotations_count < rotations) {

        let new_w = base.length;
        let new_h = base[0].length;

        let rotated = [];

        for (let y = 0; y < new_h; y++) {
            if (!rotated[y]) { rotated[y] = []; }
            for (let x = 0; x < new_w; x++) {
                let elem = (base[new_w - 1 - x] && base[new_w - 1 - x][y]) ? base[new_w - 1 - x][y] : null;
                rotated[y][x] = elem;
            }
        }
        base = rotated;
        rotations_count++;
    }
    return base;
}

GC.tools.array_fragment = function(arr, w, h, offset_x = 0, offset_y = 0) {

    let subset = [];

    for (let y = 0; y < h; y++) {
        if (!subset[y]) {subset[y] = [];}
        for (let x = 0; x < w; x++) {
            let elem = (arr[y + offset_y] && arr[y + offset_y][x + offset_x]) ? arr[y + offset_y][x + offset_x] : null;
            subset[y][x] = elem;
        }
    }
    return subset;
}

window.addEventListener("load", function () {
    GC.events.add("optionsFetched", function () {
        GC.tileset_parser.init();
    });
});