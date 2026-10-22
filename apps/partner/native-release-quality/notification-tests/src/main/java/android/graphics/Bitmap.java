package android.graphics;
public class Bitmap {
  public enum Config { ARGB_8888 }
  public boolean recycled, nullCopy, failCopy;
  public Bitmap copyResult;
  public Bitmap copy(Config config, boolean mutable) {
    if (recycled || config != Config.ARGB_8888 || mutable) throw new AssertionError("Bitmap must be copied while owned by Glide");
    if (failCopy) throw new IllegalStateException("Copy failure");
    if (nullCopy) return null;
    copyResult = new Bitmap();
    return copyResult;
  }
}
