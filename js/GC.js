/***** Glitch City v1.0.2 - auer404 *****

TODO :

• tileset_parser :

    - reduced_definition(pixel_arr , def_division) ?
        ("same but offsetted" scenario, similarity check -> false negative)

    - flip + similarity ?

    - same_pixels_flipped() : APPLY
    - similarity() : APPLY
    - same_pixels_rotated() : APPLY
    - shared_pattern() : APPLY

    - Optimization : array_2d : pre-apply once ?
    - Optimization : tools.flip/rotate/fragment/other - secure + unbind from tile_size / square scenario

*****/

const GC = {

    options_file_path: "options.json",
    options: {},

    init: function () {
        GC.preloader.register(1);
        fetch(GC.options_file_path).then(function (res) {
            res.json().then(function (file_contents) {
                GC.options = file_contents;
                GC.events.trigger("optionsFetched", GC.options);
                GC.preloader.task_done();
            });

        });
    },

    preloader: {}, // Extended below

    tileset_parser: {}, // Extended in tileset_parser.js
    tileset_map: {}, // Set in tileset_parser.js
    tileset_map_get: function () { }, // Extended in tileset_parser.js

    overworld: {}, // Extended in overworld.js
    display: {}, // Extended in display.js
    keyboard: {}, // Extended in game.js
    game: {}, // Extended in game.js / API.js
    player: {}, // Extended in game.js

    events: {

        registered_functions: {
            optionsFetched: [],
            preloadUpdate: [],
            preloadDone: [],
            tilesetMapReady: [],
            overworldSized:[],
            overworldTileReady:[],
            overworldReady: [],
            overworldFirstDrawn: [],
            overworldDrawn: [],
            gameReady: [],
            playerDrawn: [],
            playerBlocked: []
        },

        add: function (evt, fct) {
            let evt_functions = this.registered_functions[evt];
            if (evt_functions) {
                evt_functions.push(fct);
            }
        },

        trigger: function (evt, param = null) {
            let evt_functions = this.registered_functions[evt];
            if (evt_functions) {
                for (f of evt_functions) { f(param); }
            }
        }
    },

    tools: {} // Extended in tileset_parser.js / game.js / API.js
}

GC.preloader = {

    total_tasks: 0,
    tasks_done: 0,
    percent: 0,
    register_complete: false,

    register: function (amount, done = false) {
        this.total_tasks += amount;
        this.register_complete = done;
    },

    task_done: function () {
        this.tasks_done++;
        this.update();
    },

    update: function () {
        this.percent = this.tasks_done / this.total_tasks * 100;
        GC.events.trigger("preloadUpdate", this.percent);
        if (this.percent >= 100 && this.register_complete) {
            GC.events.trigger("preloadDone");
        }
    }
}

window.addEventListener("load", GC.init);