const canvas = document.querySelector("#main-canvas");
canvas.ctx = canvas.getContext("2d");

GC.events.add("overworldSized",function(ow){
    canvas.width = ow.columns * GC.options.tile_size;
    canvas.height = ow.rows * GC.options.tile_size;
});

GC.events.add("overworldTileReady",function(tile){
        canvas.ctx.drawImage(
            GC.tileset_parser.tileset_src,
            tile.uses.src_x, tile.uses.src_y,
            GC.options.src_tile_size, GC.options.src_tile_size,
            tile.x * GC.options.tile_size,
            tile.y * GC.options.tile_size,
            GC.options.tile_size, GC.options.tile_size
        );
});

GC.events.add("overworldReady",function(ow){
    console.log(ow.tiles);
});