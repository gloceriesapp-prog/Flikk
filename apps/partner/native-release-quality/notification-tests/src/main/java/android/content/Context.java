package android.content;
public class Context {
  public final Resources resources = new Resources();
  public Context applicationContext;
  public Context getApplicationContext() { return applicationContext == null ? this : applicationContext; }
  public Resources getResources() { return resources; }
  public static class Resources {
    public final DisplayMetrics displayMetrics = new DisplayMetrics();
    public DisplayMetrics getDisplayMetrics() { return displayMetrics; }
  }
  public static class DisplayMetrics { public int widthPixels, heightPixels; }
}
