package com.gloceries.partner.releasequality;

import android.os.Build;
import android.view.Window;
import android.view.WindowManager;

/**
 * Android 15 owns transparent edge-to-edge system bars. Preserve legacy bar
 * styling on older releases, without calling obsolete color APIs on API 35+.
 * App content and WindowInsetsController continue to own backgrounds/icons.
 */
@SuppressWarnings("deprecation")
public final class SystemBarCompat {
  private SystemBarCompat() {}

  public static void setStatusBarColor(Window window, int color) {
    if (Build.VERSION.SDK_INT < 35) window.setStatusBarColor(color);
  }

  public static int getStatusBarColor(Window window) {
    return Build.VERSION.SDK_INT < 35 ? window.getStatusBarColor() : 0;
  }

  public static void setNavigationBarColor(Window window, int color) {
    if (Build.VERSION.SDK_INT < 35) window.setNavigationBarColor(color);
  }

  public static int getNavigationBarColor(Window window) {
    return Build.VERSION.SDK_INT < 35 ? window.getNavigationBarColor() : 0;
  }

  public static void setCutoutMode(WindowManager.LayoutParams params, int mode) {
    if (Build.VERSION.SDK_INT < 28) return; // Cutout modes do not exist yet.
    // ALWAYS is available from API 30. Keep Android 9/10 compatibility, and
    // respect explicit NEVER/ALWAYS requests on all supported API levels.
    params.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30 && (mode == 0 || mode == 1) ? 3 : mode;
  }
}
