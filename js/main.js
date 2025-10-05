window.addEventListener("load", function(){
    document.querySelector("#dialog").style.visibility = "visible";
});

GC.events.add("preloadUpdate",function(){
    document.querySelector("#loadbar").style.width = GC.preloader.percent + "%";
});

GC.events.add("preloadDone",function(){
    setTimeout(function() {
            document.querySelector("#dialog").remove();
            GC.display.canvas.style.display="block";
        },250);
});