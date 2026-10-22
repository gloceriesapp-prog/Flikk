import android.content.Context
import android.net.Uri
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.bitmap.DownsampleStrategy
import expo.modules.notifications.notifications.presentation.builders.downloadImage
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.util.concurrent.TimeUnit

class NotificationImageTest {
  private lateinit var context: Context
  private val uri = Uri("https://example.test/notification.jpg")
  @Before fun reset() {
    Glide.reset()
    context = Context().apply {
      applicationContext = Context()
      resources.displayMetrics.widthPixels = 1440
      resources.displayMetrics.heightPixels = 3200
    }
  }

  @Test fun independentlyOwnedBitmapSurvivesTargetClear() = runBlocking {
    val result = downloadImage(context, uri)
    assertSame(context.applicationContext, Glide.receivedContext)
    assertSame(uri, Glide.receivedUri)
    assertEquals(1024, Glide.width); assertEquals(1024, Glide.height)
    assertSame(DownsampleStrategy.AT_MOST, Glide.strategy)
    assertTrue(Glide.softwareBitmap)
    assertEquals(8000, Glide.timeout); assertEquals(16000L, Glide.wait)
    assertEquals(TimeUnit.MILLISECONDS, Glide.unit)
    assertSame(Glide.original.copyResult, result)
    assertNotSame(Glide.original, result)
    assertFalse(result!!.recycled)
    assertTrue(Glide.original.recycled); assertEquals(1, Glide.clearCount)
  }

  @Test fun smallDisplaysAndInvalidDimensionsHaveSafePositiveBounds() = runBlocking {
    context.resources.displayMetrics.widthPixels = 360
    context.resources.displayMetrics.heightPixels = 800
    assertNotNull(downloadImage(context, uri))
    assertEquals(360, Glide.width); assertEquals(800, Glide.height)
    Glide.reset()
    context.resources.displayMetrics.widthPixels = 0
    context.resources.displayMetrics.heightPixels = -50
    assertNotNull(downloadImage(context, uri, -10, Long.MAX_VALUE))
    assertEquals(1, Glide.width); assertEquals(1, Glide.height)
    assertEquals(1, Glide.timeout); assertEquals(60001L, Glide.wait)
  }

  @Test fun unavailableImagesAndCopyFailuresPreserveTextDeliveryAndReleaseTargets() = runBlocking {
    for (failure in listOf("timeout", "execution", "copy", "null-copy")) {
      Glide.reset(); Glide.failure = failure
      Glide.original.failCopy = failure == "copy"
      Glide.original.nullCopy = failure == "null-copy"
      assertNull(downloadImage(context, uri))
      assertEquals(1, Glide.clearCount); assertTrue(Glide.original.recycled)
    }
  }

  @Test fun cancellationInterruptsTheWaitAndClearsWithoutReturningAnImage() = runBlocking {
    Glide.failure = "blocking"
    var returned = false
    val task = launch(Dispatchers.Default) { downloadImage(context, uri); returned = true }
    assertTrue("Image request must start", Glide.entered.await(5, TimeUnit.SECONDS))
    withTimeout(5000) { task.cancelAndJoin() }
    assertTrue(task.isCancelled)
    assertFalse("Cancellation must not become an ordinary null result", returned)
    assertEquals(1, Glide.clearCount); assertTrue(Glide.original.recycled)
  }
}
