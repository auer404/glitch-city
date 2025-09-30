GC_API = {}

GC.events = {

    registered_functions:{
        tilesetMapReady:[],
        overworldReady:[],
        overworldFirstDrawn:[],
        overworldDrawn:[],
        gameReady:[], // aka playerFirstDrawn
        playerDrawn:[],
        playerBlocked:[]
    },

    add:function(evt, fct) {
        let evt_functions = this.registered_functions[evt];
        if (evt_functions) {
            evt_functions.push(fct);
        }
    },

    trigger:function(evt) {
        let evt_functions = this.registered_functions[evt];
        if (evt_functions) {
            for (f of evt_functions) { f(); }
        }
    }
}

GC_API.show_full_overworld = function() {

    GC.display.canvas.style.display = "none";

    GC.overworld.fw_canvas = document.createElement("canvas");
    document.body.appendChild(GC.overworld.fw_canvas);
    GC.overworld.fw_canvas.width = GC.options.tile_size * GC.options.tile_columns * GC.options.panel_columns;
    GC.overworld.fw_canvas.height = GC.options.tile_size * GC.options.tile_rows * GC.options.panel_rows;
    GC.overworld.fw_canvas.ctx = GC.overworld.fw_canvas.getContext("2d");

    for (let tile of GC.overworld.tiles) {

        GC.overworld.fw_canvas.ctx.drawImage(
                GC.tileset_parser.tileset_src,
                tile.uses.src_x, tile.uses.src_y,
                GC.options.tile_size, GC.options.tile_size,
                tile.x * GC.options.tile_size, tile.y * GC.options.tile_size,
                GC.options.tile_size, GC.options.tile_size
            );
    }
}

GC_API.resume = function() {
    GC.overworld.fw_canvas.remove();
    GC.display.canvas.style.display = "block";
}

GC.game.auto_mode = false;

GC.game.choose_direction = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"];

GC.game.opposite_direction_of = {
    ArrowUp:"ArrowDown",
    ArrowDown:"ArrowUp",
    ArrowLeft:"ArrowRight",
    ArrowRight:"ArrowLeft"
}

GC_API.auto_walk = function() {
    GC.game.auto_mode = true;
    let auto_dir = GC.game.choose_direction[Math.round(Math.random() * 3)];
    GC.keyboard.keydown(auto_dir);
    window.addEventListener("keydown",GC_API.stop_auto_walk_on_keydown);
}

GC_API.stop_auto_walk_on_keydown = function(e) {
    if (Object.keys(GC.keyboard.listened_keys).includes(e.key)) {
        GC_API.stop_auto_walk();
    }
}

GC_API.stop_auto_walk = function() {
    window.removeEventListener("keydown",GC_API.stop_auto_walk_on_keydown);
    GC.game.auto_mode = false;
    for (let dir of GC.game.choose_direction) {
        GC.keyboard.keyup(dir);
    }
}

GC.events.add("playerBlocked", function() {
    
    if (GC.game.auto_mode) {

        GC.keyboard.keyup(GC.player.current_direction);

        setTimeout(function(){
            let new_dir = GC.tools.copy_except(GC.game.choose_direction , [GC.player.current_direction , GC.game.opposite_direction_of[GC.player.current_direction]])[Math.round(Math.random())];
            GC.keyboard.keydown(new_dir);
        },100);
    }

});

GC.tools.copy_except = function(src_array, trash_array) {
    let new_array = [];
    for (let elem of src_array) {
        if (!trash_array.includes(elem)) {
            new_array.push(elem);
        }
    }
    return new_array;
}