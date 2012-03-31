// a Dart port of http://jsdo.it/zarkswerk/fireworx

// Author: Fuji, Goro (gfx) <gfuji@cpan.org>
// LICENSE: The MIT License

#import('dart:html');

final num quantity  = 360;
final num size      = 2.0;
final num decay     = 0.98;
final num gravity   = 2.0;
final num speed     = 6.0;

class Random { // drand48
  static num x = 0;
  static num next() {
    x = x * 0x5DEECE66D + 0xB;
    x %= 0xFFFFFFFFFFFF;
    return x * (1.0/(0xFFFFFFFFFFFF+1));
  }
}
num random() => Random.next();

String randomColor() {
  final List<int> rgb = new List<int>(3);
  for(int i = 0; i < rgb.length; ++i) {
    rgb[i] = (random() * 0xFF + 60).toInt();
  }
  return "rgb(${rgb[0]},${rgb[1]},${rgb[2]})";
}

class Spark {
  static final num rad = Math.PI * 2;

  num posX;
  num posY;
  num velX;
  num velY;
  num size;

  Spark(this.posX, this.posY, this.size) {
    num angle    = random() * rad;
    num velocity = random() * speed;

    velX = Math.cos(angle) * velocity;
    velY = Math.sin(angle) * velocity;
  }

  bool draw(FireworkView view, String color) {
    posX += velX;
    posY += velY;

    velX *= decay;
    velY *= decay;
    size *= decay;

    posY += gravity;

    view.cx.beginPath();
    view.cx.arc(posX, posY, size, 0, rad, true);

    view.cx.fillStyle = color;

    view.cx.fill();

    // returns true if it dismissed
    if(size <= 0.1) return true;
    if(posX <= 0 || posY <= 0) return true;
    if(posX >= view.width || posY >= view.height) return true;
    return false;
  }
}

class Firework {
  final String color;
  final List<Spark> sparks;

  final FireworkView view;

  Firework(this.view, int x, int y) : color = randomColor(), sparks = new List<Spark>() {
    for(int i = 0; i < quantity; ++i) {
      sparks.add(new Spark(x, y, size));
    }
  }

  void update(CanvasRenderingContext2D cx) {
    for(int i = 0; i < sparks.length; ++i) {
      Spark s = sparks[i];

      if(s.draw(this.view, color)) {
        sparks.removeRange(i, 1);
      }
    }
  }

  bool dismissed() => sparks.isEmpty();
}

class FireworkView {
  CanvasRenderingContext2D cx;
  int width;
  int height;
  int left;
  int top;

  List<Firework> fireworks;

  int numSparks = 0;

  FireworkView(CanvasElement canvas) : fireworks = new List<Firework>() {
    cx = canvas.getContext("2d");

    width  = canvas.width;
    height = canvas.height;
    canvas.rect.then((ElementRect rect) {
      left = rect.bounding.left;
      top  = rect.bounding.top;

      canvas.on.mouseDown.add( (MouseEvent e) {
        explode(e.clientX, e.clientY);
      });
      canvas.on.touchStart.add( (TouchEvent e) {
        explode(e.touches[0].pageX, e.touches[1].pageY);
      });


      // for benchmarking
      for(int i = 0; i < 3; i++) {
        explode( random() * canvas.width, (canvas.height / 4).toInt());
      }
    });
  }

  void explode(int x, int y) {
    fireworks.add(new Firework(this, x - left, y - top));
  }

  void update() {
    if(fireworks.isEmpty()) return;

    numSparks = 0;

    for(int i = 0; i < fireworks.length; ++i) {
      Firework fw = fireworks[i];

      fw.update(cx);

      if(fw.dismissed()) {
        fireworks.removeRange(i, 1);
      }
      else {
        numSparks += fw.sparks.length;
      }
    }

    cx.fillStyle = "rgba(0, 0, 0, 0.3)";
    cx.fillRect(0, 0, width, height);
  }
}

class FPSWatcher {
  Stopwatch watch;
  int fps;

  FPSWatcher() {
    watch = new Stopwatch.start();
    fps   = 0;
  }

  void update(int numSparks) {
    ++fps;

    if(watch.elapsedInMs() >= 1000) {
      String message = "FPS: $fps (sparks: $numSparks)";
      document.query('#fps').innerHTML = message;
      if(numSparks > 0) print(message);
      watch.reset();
      fps = 0;
    }
  }
}

void main() {
  CanvasElement canvas = document.query("#night-sky");

  FireworkView view  = new FireworkView(canvas);
  FPSWatcher watcher = new FPSWatcher();

  window.setInterval(() {
    view.update();
    watcher.update(view.numSparks);
  }, 0);
}
