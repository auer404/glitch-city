GC.keyboard = {

    listened_keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false
    },

    keySequence: [],
    keyPressed: false,
    last_activeKey: false,

    activeKey: function () {
        return this.keySequence[this.keySequence.length - 1] || false;
    },

    keydown: function (key) {
        if (Object.keys(this.listened_keys).includes(key)) {
            this.listened_keys[key] = true;
            this.keyPressed = true;
            if (!this.keySequence.includes(key)) {
                this.keySequence.unshift(key);
            }
            if (GC.game.step_status == "ready") {
                GC.player.current_direction = this.activeKey();
                window.requestAnimationFrame(GC.game.draw_frame.bind(GC.game));
            }
        }
    },

    keyup: function (key) {
        if (Object.keys(this.listened_keys).includes(key)) {
            this.listened_keys[key] = false;
            this.keySequence.splice(this.keySequence.indexOf(key), 1);
            if (this.keySequence.length == 0) {
                this.keyPressed = false;
            }
        }
    },
},

GC.game = {

    ready: false,
    animation_start_ts: undefined,
    animation_previous_ts: undefined,
    step_status: "ready",
    block_ahead: false,

    offset_vectors: {
        ArrowDown: { x: 0, y: -1 },
        ArrowUp: { x: 0, y: 1 },
        ArrowLeft: { x: 1, y: 0 },
        ArrowRight: { x: -1, y: 0 }
    },

    unblock_start_tile: function () {

        let tile = GC.overworld.tile(
            GC.player.tile_position.x + Math.floor((GC.overworld.columns - GC.options.tile_columns) / 2),
            GC.player.tile_position.y + Math.floor((GC.overworld.rows - GC.options.tile_rows) / 2),
        );

        if (tile.block) {
            tile.block = false;
        }

    },

    draw_frame: function (ts) {

        this.step_status = "active";

        if (this.animation_start_ts === undefined) {
            this.animation_start_ts = ts;
        }

        const elapsed = ts - this.animation_start_ts;

        if (this.animation_previous_ts != ts) {

            const last_elapsed = ts - this.animation_previous_ts || 0;

            const offset = Math.round(elapsed / GC.options.player_step_duration * GC.options.tile_size);
            const partial_offset = last_elapsed / GC.options.player_step_duration * GC.options.tile_size;

            if (offset >= GC.options.tile_size) {
                GC.player.current_direction = GC.keyboard.activeKey() || GC.keyboard.last_activeKey;
                this.animation_start_ts = ts;
                GC.player.alt_frames_exp = (GC.player.alt_frames_exp == "") ? "_alt" : "";
                this.step_status = "ending";

            }

            let next_tile_x = GC.player.tile_position.x;
            let next_tile_y = GC.player.tile_position.y;

            switch (GC.player.current_direction) {
                case "ArrowDown": next_tile_y++; break;
                case "ArrowUp": next_tile_y--; break;
                case "ArrowLeft": next_tile_x--; break;
                case "ArrowRight": next_tile_x++; break;
            }

            let nt_display_x = next_tile_x + Math.floor((GC.overworld.columns - GC.options.tile_columns) / 2) - Math.round(GC.display.ow_position.x / GC.options.tile_size);
            let nt_display_y = next_tile_y + Math.floor((GC.overworld.rows - GC.options.tile_rows) / 2) - Math.round(GC.display.ow_position.y / GC.options.tile_size);

            while (nt_display_x < 0) {
                nt_display_x += GC.overworld.columns;
            }
            while (nt_display_x > GC.overworld.columns - 1) {
                nt_display_x -= GC.overworld.columns;
            }

            while (nt_display_y < 0) {
                nt_display_y += GC.overworld.rows;
            }
            while (nt_display_y > GC.overworld.rows - 1) {
                nt_display_y -= GC.overworld.rows;
            }

            let next_tile = GC.overworld.tile(nt_display_x, nt_display_y);

            if (next_tile.block) {
                if (offset == 0 || offset >= GC.options.tile_size) {
                    this.block_ahead = true;
                }
            } else {
                this.block_ahead = false;
            }

            if (!this.block_ahead) {

                GC.display.ow_position.x += partial_offset * this.offset_vectors[GC.player.current_direction].x;
                GC.display.ow_position.y += partial_offset * this.offset_vectors[GC.player.current_direction].y;

                if (offset >= GC.options.tile_size) {
                    GC.display.ow_position.x = GC.tools.nearestMultiple(GC.display.ow_position.x, GC.options.tile_size);
                    GC.display.ow_position.y = GC.tools.nearestMultiple(GC.display.ow_position.y, GC.options.tile_size);
                }

            } else {
                GC.events.trigger("playerBlocked");
            }

            GC.display.draw();

            GC.player.draw(elapsed);

            GC.keyboard.last_activeKey = GC.keyboard.activeKey() || GC.keyboard.last_activeKey;

        }

        if ((elapsed < GC.options.player_step_duration && this.step_status != "ending") || GC.keyboard.keyPressed === true) {
            this.animation_previous_ts = ts;
            window.requestAnimationFrame(this.draw_frame.bind(this));
        } else {
            this.animation_previous_ts = undefined;
            this.animation_start_ts = undefined;
            this.step_status = "ready";
        }

    }
}

GC.player = {

    current_direction: "ArrowDown",
    current_step_frame: 0,
    tile_position:{x:false, y:false},
    alt_frames_exp: "",

    sprite_src:false,
    sprite_map:{},

    init:function(){

        this.tile_position.x = Math.floor(GC.options.tile_columns / 2);
        this.tile_position.y = Math.floor(GC.options.tile_rows / 2);

        GC.game.unblock_start_tile();

        this.sprite_src = document.createElement("img");
        this.sprite_src.src = GC.options.player_tileset_src_path;

        this.sprite_src.addEventListener("load",function(){
            GC.preloader.register(1, true);
            fetch(GC.options.player_sprite_map_path).then(function(res){
                res.json().then(function(file_contents){
                GC.player.sprite_map = file_contents;
                GC.preloader.task_done();
                GC.player.draw();
        });
        
    });
            
        });

    },

    draw: function (ts = 0) {
        
        this.current_step_frame = Math.round(ts / GC.options.player_step_duration * GC.options.player_step_framecount);

        if (this.current_step_frame >= this.sprite_map[this.current_direction].length) {
            this.current_step_frame = 0;
        }

        let sprite_x = this.sprite_map[this.current_direction + this.alt_frames_exp][this.current_step_frame];

        let player_dest_x = this.tile_position.x * GC.options.tile_size;
        let player_dest_y = this.tile_position.y * GC.options.tile_size;

        GC.display.canvas.ctx.drawImage(
            this.sprite_src,
            sprite_x, 0,
            GC.options.src_player_tile_size, GC.options.src_player_tile_size,
            player_dest_x, player_dest_y,
            GC.options.tile_size, GC.options.tile_size
        );

        if (!GC.game.ready) {
            GC.game.ready = true;
            GC.events.trigger("gameReady");
        }
        GC.events.trigger("playerDrawn");

    }
};

GC.tools.nearestMultiple = function(n, m) {
    const M = Math.abs(m);
    const r = Math.round(n / M) * M;
    return Object.is(r, -0) ? 0 : r;
}

window.addEventListener("keydown", function (e) {
    GC.keyboard.keydown(e.key);
});

window.addEventListener("keyup", function (e) {
    GC.keyboard.keyup(e.key);
});

window.addEventListener("load",function(){
    GC.events.add("overworldFirstDrawn",function(){
        GC.player.init();
    });
});