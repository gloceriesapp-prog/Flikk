package com.gloceries.partner.releasequality;

import android.content.Context;
import android.graphics.Bitmap;
import com.bumptech.glide.Glide;
import com.bumptech.glide.RequestManager;
import com.bumptech.glide.request.FutureTarget;
import com.bumptech.glide.load.resource.bitmap.DownsampleStrategy;
import java.io.IOException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Called only from maps-utils' existing background image tasks. */
public final class KmlImageLoader {
  private KmlImageLoader() {}
  public static Bitmap load(Context context, String url) throws IOException {
    RequestManager manager = null;
    FutureTarget<Bitmap> target = null;
    try {
      manager = Glide.with(context.getApplicationContext());
      target = manager.asBitmap().load(url).override(2048, 2048)
          .downsample(DownsampleStrategy.AT_MOST).disallowHardwareConfig()
          .timeout(15000).submit();
      // maps-utils retains its own images. Copy before returning Glide's pooled
      // resource so later target clearing cannot recycle a live map bitmap.
      Bitmap owned = target.get(30, TimeUnit.SECONDS).copy(Bitmap.Config.ARGB_8888, false);
      if (owned == null) throw new IOException("Unable to copy map image");
      return owned;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("Map image loading interrupted", e);
    } catch (ExecutionException | TimeoutException e) {
      throw new IOException("Unable to load map image", e);
    } catch (RuntimeException e) {
      // KML's existing AsyncTasks handle IOException by retaining the map
      // without this image; malformed models must not crash those workers.
      throw new IOException("Unable to prepare map image", e);
    } finally {
      if (manager != null && target != null) {
        try {
          manager.clear(target);
        } catch (RuntimeException e) {
          throw new IOException("Unable to release map image request", e);
        }
      }
    }
  }
}
