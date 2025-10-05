/*

tags_last_id (for db-like auto-increment key system)

tags : [
    { id, name, tiles:[ids] }
]

patterns : [
    { id, tiles:[{id, exclusivity}] }
]

relations :
- flipped (x / y) <- AUTO
- rotated <- AUTO
- nearly same <- AUTO
- pseudo-flipped
- pseudo-rotated
- pseudo-nearlysame
- frequent neighbor (side / exclusivity) <- patterns

tile : {
    ...
    
    tags : [ids]
    patterns : [ids]
    should_block : bool
    repeat : false / exclusivity

    relations ?

    frequency (as defined by macro-patterns) ?

    door : bool
    ledge : false / {string axis, int direction}
}

*/

let drawn_tiles = [];
let drawn_tiles_xy = [];

const canvas = document.querySelector("#main-canvas");
canvas.ctx = canvas.getContext("2d");

const ui_canvas = document.querySelector("#ui-canvas");
ui_canvas.ctx = ui_canvas.getContext("2d");

GC.events.add("tilesetMapReady", draw_sorted_tileset);
window.onresize = draw_sorted_tileset;

function draw_sorted_tileset() {

    let disp_cols = Math.floor(window.innerWidth * 2 / 3 / (GC.options.tile_size + 1));
    let disp_rows = Math.ceil(GC.tileset_map.tiles.length / disp_cols);

    canvas.width = disp_cols * (GC.options.tile_size + 1);
    canvas.height = disp_rows * (GC.options.tile_size + 1);

    ui_canvas.width = canvas.width;
    ui_canvas.height = canvas.height;

    canvas.ctx.fillStyle = "#ffff00ff";
    canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);

    let tile_id = 0;

    for (let y = 0; y < disp_rows; y++) {
        for (let x = 0; x < disp_cols; x++) {
        
            let tile = GC.tileset_parser.tile_by_id(tile_id);
            if (tile) {

                canvas.ctx.drawImage(
                    GC.tileset_parser.tileset_src,
                    tile.src_x, tile.src_y,
                    GC.options.src_tile_size, GC.options.src_tile_size,
                    x * (GC.options.tile_size + 1),
                    y * (GC.options.tile_size + 1),
                    GC.options.tile_size, GC.options.tile_size
                );

                let new_drawn_tile = { x:x, y:y, src_tile:tile };
                drawn_tiles.push(new_drawn_tile);
                tile.ui_index = drawn_tiles.indexOf(new_drawn_tile);

                if (!drawn_tiles_xy[y]) {
                    drawn_tiles_xy[y] = [];
                }
                drawn_tiles_xy[y][x] = tile.ui_index;

                tile_id++;
            }
        }
    }
    draw_ui_canvas();

}

/********* UI : DRAW / GET **********/

function draw_ui_canvas() {
    ui_canvas.ctx.clearRect(0, 0, ui_canvas.width, ui_canvas.height);
    ui_canvas.ctx.fillStyle = "#ffff00ff";

    for (let tile of selected_tiles) {
        let ui_tile = drawn_tiles[tile.ui_index];
        ui_canvas.ctx.fillRect(ui_tile.x * (GC.options.tile_size + 1), ui_tile.y * (GC.options.tile_size + 1), GC.options.tile_size, GC.options.tile_size);
    }
}

function get_ui_tile(x,y) {
    return drawn_tiles[drawn_tiles_xy[y][x]];
}

/********* UI : INTERACTIONS **********/

let hovered_tile_coords = false;
let selected_tiles = [];

ui_canvas.onmousemove = function(e) {
    let mouse_coords = {
        x:e.x - ui_canvas.offsetLeft,
        y:e.y - ui_canvas.offsetTop + window.scrollY
    }
    hovered_tile_coords = {
        x:Math.max(0,Math.floor(mouse_coords.x / (GC.options.tile_size + 1))),
        y:Math.max(0,Math.floor(mouse_coords.y / (GC.options.tile_size + 1))),
    }
}

ui_canvas.onmouseout = function() {
    hovered_tile_coords = false;
}

ui_canvas.onclick = function() {

    let clicked_tile = get_ui_tile(hovered_tile_coords.x , hovered_tile_coords.y);
    if (clicked_tile) {
        clicked_tile = clicked_tile.src_tile;
    } else {
        return;
    }

    if (!shift_pressed) {
        if (!selected_tiles.includes(clicked_tile) || selected_tiles.length > 1) {
            selected_tiles = [clicked_tile];
        } else {
            selected_tiles = [];
        }
    } else {
        if (!selected_tiles.includes(clicked_tile)) {
            selected_tiles.push(clicked_tile);
        } else {
            selected_tiles.splice(selected_tiles.indexOf(clicked_tile), 1);
        }
    }
    onSelectionUpdate();
    draw_ui_canvas();
}

let shift_pressed = false;

window.addEventListener("keydown",function(e){
    if (e.key == "Shift") {
        shift_pressed = true;
    }
});

window.addEventListener("keyup",function(e){
    if (e.key == "Shift") {
        shift_pressed = false;
    }
});

function onSelectionUpdate() {

    if (selected_tiles.length == 2) {
        sp_btn.removeAttribute("disabled");
        spf_btn.removeAttribute("disabled");
        spr_btn.removeAttribute("disabled");
        sim_btn.removeAttribute("disabled");
        sh_btn.removeAttribute("disabled");
    } else {
        sp_btn.setAttribute("disabled",true);
        spf_btn.setAttribute("disabled",true);
        spr_btn.setAttribute("disabled",true);
        sim_btn.setAttribute("disabled",true);
        sh_btn.setAttribute("disabled",true);
    }
}

function output(msg) {
    document.querySelector("#output").textContent = msg;
}

let sp_btn = document.querySelector("#same_pixels");
sp_btn.onclick = function() {
    output(GC.tileset_parser.same_pixels(selected_tiles[0], selected_tiles[1]));
}
let spf_btn = document.querySelector("#same_pixels_flipped");
spf_btn.onclick = function() {
    output(JSON.stringify(GC.tileset_parser.same_pixels_flipped(selected_tiles[0], selected_tiles[1], true)));
}
let spr_btn = document.querySelector("#same_pixels_rotated");
spr_btn.onclick = function() {
    output(GC.tileset_parser.same_pixels_rotated(selected_tiles[0], selected_tiles[1], true));
}
let sim_btn = document.querySelector("#similarity");
sim_btn.onclick = function() {
    output(GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1]));
}
let sh_btn = document.querySelector("#share");
sh_btn.onclick = function() {
    output(GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], 8));
}