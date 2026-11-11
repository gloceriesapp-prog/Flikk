const { checkNativeRelease } = require('./native-compatibility.cjs');
try {
  checkNativeRelease(process.env.OTA_NATIVE_BUILD_COMMIT, process.env.OTA_PLATFORM);
  console.log('Native runtime release guard passed.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
