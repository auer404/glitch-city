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

let tile_gap = 1;

const canvas = document.querySelector("#main-canvas");
canvas.ctx = canvas.getContext("2d");

const ui_canvas = document.querySelector("#ui-canvas");
ui_canvas.ctx = ui_canvas.getContext("2d");

GC.events.add("tilesetMapReady", draw_sorted_tileset);
window.onresize = draw_sorted_tileset;

function draw_sorted_tileset() {

    let disp_cols = Math.floor(window.innerWidth * 2 / 3 / (GC.options.tile_size + tile_gap));
    let disp_rows = Math.ceil(GC.tileset_map.tiles.length / disp_cols);

    canvas.width = disp_cols * (GC.options.tile_size + tile_gap);
    canvas.height = disp_rows * (GC.options.tile_size + tile_gap);

    ui_canvas.width = canvas.width;
    ui_canvas.height = canvas.height;

    canvas.ctx.fillStyle = "#ffff6fff";
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
                    x * (GC.options.tile_size + tile_gap),
                    y * (GC.options.tile_size + tile_gap),
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
    ui_canvas.ctx.fillStyle = "#baff70ff";

    for (let tile of selected_tiles) {
        let ui_tile = drawn_tiles[tile.ui_index];
        ui_canvas.ctx.fillRect(ui_tile.x * (GC.options.tile_size + tile_gap), ui_tile.y * (GC.options.tile_size + tile_gap), GC.options.tile_size, GC.options.tile_size);
    }
}

let tile_details = document.querySelector("#tile_details");

function draw_selected_tiles_detail() {
    tile_details.innerHTML = "";
    if (selected_tiles.length > 0) {
        tile_details.innerHTML = "<h2>Selected :</h2>";
    }
    for (let tile of selected_tiles) {
        let ui_tile = drawn_tiles[tile.ui_index];
        let d_canvas = document.createElement("canvas");
        tile_details.appendChild(d_canvas);
        d_canvas.width = 96; d_canvas.height = 96;
        d_canvas.getContext("2d").drawImage(
            GC.tileset_parser.tileset_src,
                    tile.src_x, tile.src_y,
                    GC.options.src_tile_size, GC.options.src_tile_size,
                    0, 0,
                    96, 96
                );
    }
}

function get_ui_tile(x,y) {
    return drawn_tiles[drawn_tiles_xy[y][x]];
}

/********* UI : INTERACTIONS **********/

GC.events.add("optionsFetched", function(){
    document.querySelector("#gap_modifier").setAttribute("max", GC.options.tile_size);
});

document.querySelector("#gap_modifier").value = tile_gap;

document.querySelector("#gap_modifier").oninput = function(){
    tile_gap = this.value * 1;
    console.log("Tile gap :",tile_gap);
    draw_sorted_tileset();
}

let hovered_tile_coords = false;
let selected_tiles = [];

ui_canvas.onmousemove = function(e) {
 
    let mouse_coords = {
        x:e.x - ui_canvas.offsetLeft,
        y:e.y - ui_canvas.offsetTop + window.scrollY
    }

    hovered_tile_coords = {
        x:Math.max(0,Math.floor(mouse_coords.x / (GC.options.tile_size + tile_gap))),
        y:Math.max(0,Math.floor(mouse_coords.y / (GC.options.tile_size + tile_gap)))
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
    draw_selected_tiles_detail();
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
    for (let btn of document.querySelectorAll(".compare_two")) {
        if (selected_tiles.length == 2) {
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled",true);
        }
    }
}

function output(msg) {
    document.querySelector("#output").innerHTML = msg;
}

/******** BUTTON HANDLERS *********/

let sp_btn = document.querySelector("#same_pixels");
sp_btn.onclick = function() {
    output(GC.tileset_parser.same_pixels(selected_tiles[0], selected_tiles[1]));
}

let spf_btn = document.querySelector("#same_pixels_flipped");
spf_btn.onclick = function() {
    let new_v = JSON.stringify(GC.tileset_parser.same_pixels(selected_tiles[0], selected_tiles[1], {flip:"x"}));
    new_v += " / " + JSON.stringify(GC.tileset_parser.same_pixels(selected_tiles[0], selected_tiles[1], {flip:"y"}));
    output(new_v);
}

let spr_btn = document.querySelector("#same_pixels_rotated");
spr_btn.onclick = function() {
    let new_v = JSON.stringify(GC.tileset_parser.same_pixels(selected_tiles[0], selected_tiles[1], {rotate:1}));
    new_v += " / " + JSON.stringify(GC.tileset_parser.same_pixels(selected_tiles[0], selected_tiles[1], {rotate:2}));
    new_v += " / " + JSON.stringify(GC.tileset_parser.same_pixels(selected_tiles[0], selected_tiles[1], {rotate:3}));
    output(new_v);
}

let sim_btn = document.querySelector("#similarity");
sim_btn.onclick = function() {
    output(GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1]));
}
let sim_btn_f = document.querySelector("#similarity_f");
sim_btn_f.onclick = function() {
    let msg = GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {flip:"x"});
    msg += " / " + GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {flip:"y"});
    output (msg);
}

let sim_btn_r = document.querySelector("#similarity_r");
sim_btn_r.onclick = function() {
   let msg = GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {rotate:1});
    msg += " / " + GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {rotate:2});
    msg += " / " + GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {rotate:3});
    output (msg);
}

let sim_btn_l = document.querySelector("#similarity_l");
sim_btn_l.onclick = function() {
   let msg = "top half : " + GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {y_end:15});
    msg += "<br>bottom half : " + GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {y_start:16});
    msg += "<br>left half : " + GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {x_end:15});
    msg += "<br>right half :" + GC.tileset_parser.similarity(selected_tiles[0], selected_tiles[1], {x_start:16});
    output (msg);
}

let shs_btn = document.querySelector("#share_strict");
shs_btn.onclick = function() {
    output(GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1]));
}

let sh_btn = document.querySelector("#share");
sh_btn.onclick = function() {
    output(GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {strict_position:false}));
}

let shbs_btn = document.querySelector("#share_blur_strict");
shbs_btn.onclick = function() {
   output(GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {blur:true}));
}

let shb_btn = document.querySelector("#share_blur");
shb_btn.onclick = function() {
   output(GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {blur:true,strict_position:false}));
}

let shf_btn = document.querySelector("#share_flip");
shf_btn.onclick = function() {
   let msg = GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {strict_position:false, flip:"x"});
   msg += " / " + GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {strict_position:false, flip:"y"});
   output(msg);
}

let shr_btn = document.querySelector("#share_rotate");
shr_btn.onclick = function() {
   let msg = GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {strict_position:false, rotate:1});
   msg += " / " + GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1],{strict_position:false, rotate:2});
   msg += " / " + GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1],{strict_position:false, rotate:3});
   output(msg);
}

let shl_btn = document.querySelector("#share_loc");
shl_btn.onclick = function() {
   let msg = "top half : " + GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {y_end:15});
    msg += "<br>bottom half : " + GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {y_start:16});
    msg += "<br>left half : " + GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {x_end:15});
    msg += "<br>right half : " + GC.tileset_parser.share_patterns(selected_tiles[0], selected_tiles[1], {x_start:16});
    output (msg);
}