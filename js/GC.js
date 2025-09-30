/***** Glitch City v1.0.1 - auer404 *****

TODO :
• De-"hardcode" player sprite map (-> json)
• FIX : panel_rows / columns == 1 -> warp incomplete (x y conflict)
• Optimization : redundant calculations -> props, etc.
*****/

const GC = {

    options_file_path:"options.json",
    options:{}, // Loaded below

    preloader:{}, // Extended below

    tileset_parser:{}, // Extended in tileset_parser.js
    tileset_map:{}, // Set in tileset_parser.js
    tileset_map_get:function(){}, // Extended in tileset_parser.js

    overworld:{}, // Extended in overworld.js
    display:{}, // Extended in display.js
    keyboard:{}, // Extended in game.js
    game:{}, // Extended in game.js / API.js
    player:{}, // Extended in game.js

    events:{}, // Extended in API.js

    tools:{} // Extended in game.js / API.js
}

GC.preloader = {

    dialog:document.querySelector("#dialog"),
    loadbar:document.querySelector("#loadbar"),
    total_tasks:0,
    tasks_done:0,
    register_complete:false,

    init:function() {
        this.dialog.style.visibility = "visible";
    },

    register:function(amount, done = false) {
        this.total_tasks += amount;
        this.register_complete = done;
    },

    task_done:function() {
        this.tasks_done++;
        this.update();
    },

    update:function() {
        let percent = this.tasks_done / this.total_tasks * 100;
        this.loadbar.style.width = percent + "%";
        if (percent >= 100 && this.register_complete) {
            this.onDone();
        }
    },

    onDone:function() {
        setTimeout(function() {
            this.dialog.remove();
            GC.display.canvas.style.display="block";
        }.bind(this),250);
    }
}

window.addEventListener("load", function(){ /****** MAIN ******/

    GC.preloader.init();

    GC.preloader.register(1);
    fetch(GC.options_file_path).then(function(res){
        res.json().then(function(file_contents){
            GC.options = file_contents;
            GC.tileset_parser.init();
            GC.preloader.task_done();
        });
        
    });
    ;
});