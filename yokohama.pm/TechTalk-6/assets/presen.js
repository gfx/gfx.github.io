var Event = {};
Event.stop = function(e){
    Event.stopAction(e);
    Event.stopEvent(e);
};
Event.stopAction = function(e){
    e.preventDefault ? e.preventDefault() : (e.returnValue = false)
};
Event.stopEvent = function(e){
    e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true)
};

// -------------------------------------------------------------------------

var start_time = new Date();
var Presen = {};
Presen.init = function(data){
    this.data = data;

    this.init_sections();
    this.init_title();
    this.init_page();
    this.format_cache = new Array();
    this.rewrite();

    // TODO: fix me
    // $("#page_info").css('left', (window.innerWidth - 200) + "px");

    $("#total_page").html(Presen.sections.length);

    Presen.update_footer();
    setInterval(
        Presen.update_footer, 1000
    );
};

Presen.init_page = function () {
    if (location.hash == "") {
        this.page = 0;
    } else {
        this.page = parseInt(location.hash.substr(1));
    }
}

Presen.init_sections = function () {
    var sections = [[]];
    var topic_reg = /^----/;
    $(this.data).each(function (i, line) {
        if (topic_reg.test(line)){
            sections.push([line]);
        } else {
            sections[sections.length-1].push(line);
        }
    });
    this.sections = sections;
};

Presen.init_title = function () {
    var title = this.sections[0][0].replace(/^\*+/, "");
    document.title = title;
    $("#title").html(title);
};

Presen.has_next = function(){
    return this.page < this.sections.length-1;
};
Presen.next = function(){
    if (!this.has_next()) {
        return;
    }
    this.page++;
    this.rewrite();
};

Presen.has_prev = function(){
    return this.page > 0;
}
Presen.prev = function(){
    if (! this.has_prev()) {
        return; // nop.
    }
    this.page--;
    this.rewrite();
};

Presen.update_footer = function () {
    var now = new Date();
    $("#time").html(sprintf('%02d:%02d:%02d', now.getHours(), now.getMinutes(), now.getSeconds()));

    var rest = (now - start_time) / 1000;
    $('#rest_time').html(sprintf('[%02d:%02d]', (rest / 60) % 60, rest % 60));

    $("#current_page").html(Presen.page+1);

    $("#footer").css('top', (window.innerHeight - 50) + "px");
}

Presen.rewrite = function(){
    var p = this.page;
    if (!this.format_cache[p]) {
        this.format_cache[p] = this.format(this.sections[p]);
    }
    $("#topics").html(this.format_cache[p]);
    location.hash = "#" + p;
    this.update_footer();
};

Presen.format = function(lines){
    var context = [];
    var mode = "p";
    $(lines).each(function(i, v){
        if (/^----$/.test(v)) {
            return; // page separater
        }

        if(/^\*\*/.test(v)){
            context.push(v.replace(/^\*+/, "").tag("h3"));
            return;
        }
        if(/^\*/.test(v)){
            context.push(v.replace(/^\*+/, "").tag("h2"));
            return;
        }
        if(/^\-\-/.test(v)){
            context.push(v.replace(/^\-+/,"&nbsp;&nbsp;-").tag("span", "list_child") + "<br />");
            return;
        }
        if(/^\-/.test(v)){
            context.push(v.replace(/^\-+/,"*").tag("span","list") + '<br/>');
            return;
        }
        
        if (/^\>\|\|/.test(v)) {
            mode = "pre";
            context.push("<pre>");
            return;
        }
        if (/^\|\|\</.test(v)) {
            mode = "p";
            context.push("</pre>");
            return;
        }
        
        if (mode=="pre") {
            context.push(v.escapeHTML().tag("span") + "\n");
        } else {
            context.push(v.tag("span") + "<br>");
        }
    });
    return context.join("");
};

String.prototype.tag = function(tag, classname){
    return ['<',tag, (classname ? " class='"+classname+"'" : ""), '>',this,'</',tag,'>'].join("");
}

String.prototype.escapeHTML = function () {
    return this.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // " for poor editors
}

Presen.observe_key_event = function () {
    $(document).keydown(function(e) {
        switch(e.keyCode){
            case 82: // r
                location.reload();
                break;
            
            case 80: // p
            case 75: // k
            case 38: // <up>
            case  8: // <backspace>
                Presen.prev();
                Event.stop(e);
                break;
            
            case 78: // n
            case 74: // j
            case 40: // <down>
            case 32: // <space>
            case 13: // <enter>
                Presen.next();
                Event.stop(e);
                break;
        }
    });
};

// -------------------------------------------------------------------------

// load main text

$(function (){
    $.get('main.txt', function (text) {
        try {
            Presen.init(text.split("\n"));
        } catch(e) {
            alert(e) 
        }
    });

    Presen.observe_key_event();
});

