package com.bumptech.glide;
import android.content.Context;
import android.graphics.Bitmap;
import android.net.Uri;
import com.bumptech.glide.load.resource.bitmap.DownsampleStrategy;
import java.util.concurrent.*;

/** Deliberately observable fake; no network or real decoding in JVM policy tests. */
public class Glide {
  public static final Glide INSTANCE = new Glide();
  public static Bitmap original;
  public static Context receivedContext;
  public static Uri receivedUri;
  public static int width, height, timeout, clearCount;
  public static long wait;
  public static TimeUnit unit;
  public static DownsampleStrategy strategy;
  public static boolean softwareBitmap;
  public static String failure;
  public static CountDownLatch entered;
  public static void reset() {
    original = new Bitmap(); receivedContext = null; receivedUri = null;
    width=height=timeout=clearCount=0; wait=0; unit=null; strategy=null;
    softwareBitmap=false; failure=""; entered=new CountDownLatch(1);
  }
  public static Glide with(Context context) { receivedContext=context; return INSTANCE; }
  public Glide asBitmap() { return this; }
  public Glide load(Uri uri) { receivedUri=uri; return this; }
  public Glide override(int w,int h) { width=w; height=h; return this; }
  public Glide downsample(DownsampleStrategy value) { strategy=value; return this; }
  public Glide disallowHardwareConfig() { softwareBitmap=true; return this; }
  public Glide timeout(int value) { timeout=value; return this; }
  public Target submit() { return new Target(); }
  public void clear(Target target) { clearCount++; original.recycled=true; }
  public static class Target {
    public Bitmap get(long value,TimeUnit timeUnit) throws Exception {
      wait=value; unit=timeUnit; entered.countDown();
      if (failure.equals("blocking")) { Thread.sleep(60000); throw new AssertionError("Cancellation did not interrupt loader"); }
      if (failure.equals("timeout")) throw new TimeoutException();
      if (failure.equals("execution")) throw new ExecutionException(new Exception("Network unavailable"));
      return original;
    }
  }
}
