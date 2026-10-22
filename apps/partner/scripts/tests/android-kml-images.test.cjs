/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Compile the actual production helper. Fakes model Glide returning a pooled
// bitmap that becomes invalid on clear, making resource ownership observable.
test('KML images are bounded, independently owned, and cleared on every completion path', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'partner-kml-images-'));
  const write = (file, text) => {
    const dest = path.join(dir, file); mkdirSync(path.dirname(dest), { recursive: true }); writeFileSync(dest, text); return dest;
  };
  const java = tool => process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', tool) : tool;
  const files = [
    write('android/content/Context.java', `package android.content; public class Context {
      public static final Context APP = new Context(); public Context getApplicationContext() { return APP; }
    }`),
    write('android/graphics/Bitmap.java', `package android.graphics; public class Bitmap {
      public enum Config { ARGB_8888 } public boolean recycled, nullCopy; public Bitmap copyResult;
      public Bitmap copy(Config config, boolean mutable) {
        if(recycled || config != Config.ARGB_8888 || mutable) throw new AssertionError("Bad bitmap ownership");
        if(nullCopy) return null; copyResult = new Bitmap(); return copyResult;
      }
    }`),
    write('com/bumptech/glide/load/resource/bitmap/DownsampleStrategy.java', `package com.bumptech.glide.load.resource.bitmap;
      public class DownsampleStrategy { public static final DownsampleStrategy AT_MOST = new DownsampleStrategy(); }
    `),
    write('com/bumptech/glide/request/FutureTarget.java', `package com.bumptech.glide.request;
      import android.graphics.Bitmap; import java.util.concurrent.*;
      public class FutureTarget<T> {
        public static String failure = ""; public static Bitmap original; public static boolean fetched;
        @SuppressWarnings("unchecked") public T get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException {
          if(timeout != 30 || unit != TimeUnit.SECONDS) throw new AssertionError("Unbounded wait");
          fetched = true;
          if(failure.equals("timeout")) throw new TimeoutException();
          if(failure.equals("execution")) throw new ExecutionException(new Exception());
          if(failure.equals("interrupted")) throw new InterruptedException();
          if(failure.equals("runtime")) throw new IllegalStateException();
          return (T) original;
        }
      }
    `),
    write('com/bumptech/glide/Glide.java', `package com.bumptech.glide;
      import android.content.Context; import android.graphics.Bitmap; import com.bumptech.glide.request.FutureTarget;
      import com.bumptech.glide.load.resource.bitmap.DownsampleStrategy;
      public class Glide {
        public static int clears; public static boolean configured; public static final RequestManager INSTANCE = new RequestManager();
        public static RequestManager with(Context context) {
          if(context != Context.APP) throw new AssertionError("Activity retained");
          if(FutureTarget.failure.equals("setup")) throw new IllegalStateException(); return INSTANCE;
        }
        public Glide asBitmap() { return this; }
        public Glide load(String url) { if(!url.equals("https://example.test/map.png")) throw new AssertionError(); return this; }
        public Glide override(int width,int height) { if(width != 2048 || height != 2048) throw new AssertionError("Unbounded decode"); return this; }
        public Glide downsample(DownsampleStrategy strategy) { if(strategy != DownsampleStrategy.AT_MOST) throw new AssertionError(); return this; }
        public Glide disallowHardwareConfig() { configured = true; return this; }
        public Glide timeout(int value) { if(value != 15000) throw new AssertionError("Unbounded network wait"); return this; }
        public FutureTarget<Bitmap> submit() { if(!configured) throw new AssertionError(); return new FutureTarget<Bitmap>(); }
        public void clear(FutureTarget<Bitmap> target) {
          if(!FutureTarget.fetched) throw new AssertionError(); clears++; FutureTarget.original.recycled = true;
          if(FutureTarget.failure.equals("clear")) throw new IllegalStateException();
        }
      }
    `),
    write('com/bumptech/glide/RequestManager.java', 'package com.bumptech.glide; public class RequestManager extends Glide {}'),
    write('ImagePolicyTest.java', `import android.content.Context; import android.graphics.Bitmap;
      import com.bumptech.glide.Glide; import com.bumptech.glide.request.FutureTarget;
      import com.gloceries.partner.releasequality.KmlImageLoader; import java.io.IOException;
      public class ImagePolicyTest {
        static void check(boolean condition) { if(!condition) throw new AssertionError(); }
        public static void main(String[] args) throws Exception {
          for(String scenario : new String[]{"", "null-copy", "timeout", "execution", "interrupted", "runtime", "setup", "clear"}) {
            FutureTarget.failure = scenario; FutureTarget.original = new Bitmap(); FutureTarget.original.nullCopy = scenario.equals("null-copy");
            FutureTarget.fetched = false; Glide.clears = 0; Glide.configured = false;
            try {
              Bitmap result = KmlImageLoader.load(new Context(), "https://example.test/map.png");
              check(scenario.isEmpty()); check(result == FutureTarget.original.copyResult && result != FutureTarget.original);
              check(!result.recycled);
            } catch(IOException error) { check(!scenario.isEmpty()); }
            check(scenario.equals("setup") ? Glide.clears == 0 : Glide.clears == 1 && FutureTarget.original.recycled);
            check(Thread.currentThread().isInterrupted() == scenario.equals("interrupted")); Thread.interrupted();
          }
        }
      }
    `),
    path.resolve(__dirname, '../../native-release-quality/app/com/gloceries/partner/releasequality/KmlImageLoader.java'),
  ];
  try {
    const compile = spawnSync(java('javac'), ['-d', dir, ...files], { encoding: 'utf8' });
    assert.equal(compile.status, 0, compile.stderr || compile.error?.message);
    const run = spawnSync(java('java'), ['-cp', dir, 'ImagePolicyTest'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr || run.error?.message);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
