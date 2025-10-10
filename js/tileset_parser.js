GC.tileset_parser = {

    canvas: false,
    tileset_src: false,

    preprocess_default_settings: {
        flatten: false,
        flip: false,
        rotate: false,
        x_start: false,
        y_start: false,
        x_end: false,
        y_end: false,
        resample_first: false
    },

    share_patterns_default_settings: {
        definition: false,
        strict_position: true,
        blur: false
    },

    init: function () {

        this.share_patterns_default_settings.definition = GC.options.tile_size / 4;

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
                tile.pixels_2d = GC.tools.array_2d(pixels);
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

    preprocess_pixels: function (tile, options_obj = {}) {

        let options = { ...this.preprocess_default_settings, ...options_obj }

        let resample = (options.x_start !== false || options.y_start !== false || options.x_end !== false || options.y_end !== false);
        let resample_done = false;

        let pixels_ready = tile.pixels_2d;

        if (resample) {
            options.x_start = options.x_start || 0;
            options.y_start = options.y_start || 0;
            options.x_end = options.x_end || pixels_ready[0].length;
            options.y_end = options.y_end || pixels_ready.length;
        }

        if (resample && options.resample_first) {

            pixels_ready = GC.tools.array_sample(
                pixels_ready,
                options.x_end - options.x_start,
                options.y_end - options.y_start,
                options.x_start,
                options.y_start
            );
            resample = false;
            resample_done = true;
        }

        if (options.flatten && !options.flip && !options.rotate && !resample) {
            if (resample_done) {
                pixels_ready = GC.tools.array_2d_flatten(pixels_ready);
            } else {
                pixels_ready = tile.pixels;
            }
        }

        if (options.flip) { pixels_ready = GC.tools.array_flip(pixels_ready, options.flip); }
        if (options.rotate) { pixels_ready = GC.tools.array_rotate(pixels_ready, options.rotate); }

        if (resample) {
            pixels_ready = GC.tools.array_sample(
                pixels_ready,
                options.x_end - options.x_start,
                options.y_end - options.y_start,
                options.x_start,
                options.y_start
            );
        }

        if (options.flatten && (options.flip || options.rotate || resample)) { pixels_ready = GC.tools.array_2d_flatten(pixels_ready); }

        return pixels_ready;
    },

    compare_pixels: function (pixels_a, pixels_b, mode = "flag diff") {

        let flattened = (pixels_a[0][0] === undefined);

        let diff_found = false;
        let similar_found = 0;

        let y_max = pixels_a.length;
        let x_max;
        if (flattened) {
            x_max = 1;
        } else {
            x_max = pixels_a[0].length;
        }

        for (let y = 0; y < y_max; y++) {
            for (let x = 0; x < x_max; x++) {
                let same_r, same_g, same_b;
                if (flattened) {
                    same_r = pixels_a[y].r == pixels_b[y].r;
                    same_g = pixels_a[y].g == pixels_b[y].g;
                    same_b = pixels_a[y].b == pixels_b[y].b;
                } else {
                    same_r = pixels_a[y][x].r == pixels_b[y][x].r;
                    same_g = pixels_a[y][x].g == pixels_b[y][x].g;
                    same_b = pixels_a[y][x].b == pixels_b[y][x].b;
                }
                if (!same_r || !same_g || !same_b) {
                    diff_found = true;
                    if (mode == "flag diff") { break; }
                }
                if (same_r && same_g && same_b) {
                    similar_found++;
                }
            }
            if (diff_found && mode == "flag diff") { break; }
        }
        if (mode == "flag diff") {
            return !diff_found;
        } else if (mode == "count similar") {
            return similar_found;
        }
    },

    compare_brightness: function (pixels_a, pixels_b) {
        return this.get_average_brightness(pixels_a) == this.get_average_brightness(pixels_b);
    },

    get_average_brightness: function (pixel_arr) {

        let flattened = (pixel_arr[0][0] === undefined);

        let y_max = pixel_arr.length;
        let x_max;
        if (flattened) {
            x_max = 1;
        } else {
            x_max = pixel_arr[0].length;
        }

        let brightness_sum = 0;

        for (let y = 0; y < y_max; y++) {
            for (let x = 0; x < x_max; x++) {

                let pixel = pixel_arr[y];

                if (!flattened) {
                    pixel = pixel_arr[y][x];
                }
                brightness_sum += pixel.brightness;
            }

        }
        return brightness_sum / y_max * x_max;
    },

    same_pixels: function (tile_a, tile_b, options_obj = {}) {

        if (!options_obj.flatten) {
            options_obj.flatten = true;
        }

        let minimal_options_obj = { ...options_obj, flip: false, rotate: false }

        let pixels_a = this.preprocess_pixels(tile_a, minimal_options_obj);
        let pixels_b = this.preprocess_pixels(tile_b, options_obj);

        return this.compare_pixels(pixels_a, pixels_b);
    },

    similarity: function (tile_a, tile_b, options_obj = {}) {

        if (!options_obj.flatten) {
            options_obj.flatten = true;
        }

        let minimal_options_obj = { ...options_obj, flip: false, rotate: false }

        let pixels_a = this.preprocess_pixels(tile_a, minimal_options_obj);
        let pixels_b = this.preprocess_pixels(tile_b, options_obj);

        return this.compare_pixels(pixels_a, pixels_b, "count similar") / pixels_a.length;
    },

    share_patterns: function (tile_a, tile_b, options_obj = {}) {

        let options = { ...this.share_patterns_default_settings, ...options_obj };
        let minimal_options_obj = { ...options, flip: false, rotate: false }

        let pixels_a = this.preprocess_pixels(tile_a, minimal_options_obj);
        let pixels_b = this.preprocess_pixels(tile_b, options_obj);

        let patterns_a = [];
        let patterns_b = [];

        for (let y = 0; y <= pixels_a.length - options.definition; y += options.definition) {
            for (let x = 0; x <= pixels_a[0].length - options.definition; x += options.definition) {

                let is_distinct_a = true;
                let new_pattern_a = GC.tools.array_2d_flatten(
                    GC.tools.array_sample(
                        pixels_a,
                        options.definition, options.definition,
                        x, y
                    ));

                let is_distinct_b = true;
                let new_pattern_b = GC.tools.array_2d_flatten(
                    GC.tools.array_sample(
                        pixels_b,
                        options.definition, options.definition,
                        x, y
                    ));

                if (!options.strict_position) {

                    let a_already_exists = false;

                    for (let a_stored of patterns_a) {
                        if (this.compare_pixels(a_stored, new_pattern_a)) {
                            a_already_exists = true;
                        }
                    }
                    is_distinct_a = !a_already_exists;

                    let b_already_exists = false;

                    for (let b_stored of patterns_b) {
                        if (this.compare_pixels(b_stored, new_pattern_b)) {
                            b_already_exists = true;
                        }
                    }
                    is_distinct_b = !b_already_exists;
                }

                if (is_distinct_a || patterns_a.length == 0) {
                    patterns_a.push(new_pattern_a);
                }
                if (is_distinct_b || patterns_b.length == 0) {
                    patterns_b.push(new_pattern_b);
                }
            }
        }

        let amount = 0;
        for (let a_i = 0; a_i < patterns_a.length; a_i++) {

            let comparison_depth = patterns_b.length;
            if (options.strict_position) {
                comparison_depth = 1;
            }

            for (let b_i = 0; b_i < comparison_depth; b_i++) {

                let tested_a = patterns_a[a_i];
                let tested_b = patterns_b[b_i];
                if (options.strict_position) {
                    tested_b = patterns_b[a_i];
                }

                if ((!options.blur && this.compare_pixels(tested_a, tested_b)) || (options.blur && this.compare_brightness(tested_a, tested_b))) {
                    amount++;
                }
            }
        }

        let max = patterns_a.length;
        if (!options.strict_position) {
            max = (patterns_a.length + patterns_b.length) / 2;
        }

        let ratio = amount / max;

        return Math.min(ratio, 1);
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

    if (arr[0][0]) { return arr; }

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

GC.tools.array_2d_flatten = function (arr) {

    if (!arr[0][0]) { return arr; }

    let flattened = [];

    for (let y = 0; y < arr.length; y++) {
        for (let x = 0; x < arr[y].length; x++) {
            flattened.push(arr[y][x]);
        }
    }
    return flattened;
}

GC.tools.array_flip = function (arr, axis) {

    if (axis == "y" || !arr[0][0]) {
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

    if (!arr[0][0]) { return arr; }

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

GC.tools.array_sample = function (arr, w, h, offset_x = 0, offset_y = 0) {

    let subset = [];

    if (!arr[0][0]) { return subset; }

    for (let y = 0; y < h; y++) {
        if (!subset[y]) { subset[y] = []; }
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