// forked from http://jsdo.it/os0x/slide

function init() {
    // まずはページ幅取得
    var width = document.documentElement.clientWidth;
    document.body.className = 'slidemode';
    // フォントサイズ調整
    document.body.style.fontSize = width / 5 + '%';


    var slides = [];
    var SV = 'slide view';
    var SR = 'slide right';
    var SL = 'slide left';
    // スライドの各ページを取得
    // divタグのクラス名で判定
    var divs = document.body.getElementsByTagName('div');
    for (var i = 0,l = divs.length;i<l;i++){
      if(/slide/i.test(divs[i].className)){
        divs[i].className = SR;
        slides.push(divs[i]);
      }
    }
    document.title = document.title + ' - ' + slides.length + ' pages';

    //現在のページ
    var current = 0;
    var count = slides.length;

    document.body.onclick = function(e){
      var ev = e||window.event;
      var x = ev.clientX;
      if (width*0.95 < x && slides[current+1]){
        //右余白がクリックされたとき
        next();
      } else if (width*0.05 > x && slides[current-1]) {
        //左余白がクリックされたとき
        prev();
      }
    };
    var Down = -1, Up = 1;
    if (document.body.onmousewheel !== void 0 || window.opera){
      // onmousewheelが使えるか判定(Firefox以外はこちら)
      document.body.onmousewheel = mousewheel;
    } else {
      // 実質Firefox用の処理。onmousewheelをサポートしたら上の処理だけで済むようになるはず
      document.body.addEventListener('DOMMouseScroll',mousewheel,false);
    }
    function mousewheel(e){
      var ev = e||window.event;
      var dir = ev.wheelDelta || -ev.detail;
      dir = dir < 0 ? Down : Up;
      if (dir === Down && slides[current+1]){
        next();
      } else if (dir === Up && slides[current-1]) {
        prev();
      }
    };
    var J = "J".charCodeAt(0), K = "K".charCodeAt(0), R = "R".charCodeAt(0),
        SP = " ".charCodeAt(0);
        Left = 37, Right = 39;
    function key_slide(evt){
      if (!evt) {
        evt = window.event;
      }
      var c = evt.keyCode;
      if ((c === J || c === Right || c == SP) && slides[current+1]) {
        next();
        return false;
      } else if ((c === K || c === Left) && slides[current-1]){
        prev();
        return false;
      } else if(c == R) {
        location.reload();
        return false;
      }
    }
    document.onkeydown = key_slide;

    function changePage(){
      var m;
      if (m=location.hash.match(/^#Page(\d+)$/)){
        current = +m[1];
        for (var i = 0;i < current && slides[i];i++){
          slides[i].className = SL;
        }
        slides[current].className = SV;
      } else {
        slides[0].className = SV;
      }
    };
    function next(){
      slides[current++].className = SL;
      slides[current].className = SV;
      location.hash = 'Page'+current;
      changePage();
    }
    function prev(){
      slides[current--].className = SR;
      slides[current].className = SV;
      location.hash = 'Page'+current;
      changePage();
    }

    changePage();
    //setTimeout(changePage, 1000);
    if(top == self){
      document.body.className += ' top';
    }
}

