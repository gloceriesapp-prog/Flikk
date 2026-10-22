# Notification image policy tests

This isolated JVM project compiles the actual installed `expo-notifications`
`DownloadImage.kt`, including the repository's patch, against deterministic
Android and Glide fakes. It uses the real Kotlin coroutines dependency version
used by Expo (`1.10.2`). No network images are fetched during tests.

The tests verify bounded dimensions and timeouts, ownership of the returned
bitmap after Glide releases its pooled resource, target cleanup on failures,
and interruption/propagation of genuine coroutine cancellation. The fake target
invalidates its original bitmap on clear, so returning Glide's original bitmap
fails the ownership assertions.

After dependency installation and Android prebuild, run from `apps/partner`:

```sh
./android/gradlew -p native-release-quality/notification-tests test --no-daemon --max-workers=2
```

Use JDK 17. CI runs this gate after its existing native prebuild and bytecode
transformation tests. Results appear under `build/test-results/test`.

These are policy tests, not a substitute for compiling the real Android module,
testing image decoding on a device, or Google Play's analysis of a new bundle.
