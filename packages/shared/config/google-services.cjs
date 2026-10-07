// One google-services.json for every app: the Firebase project "gloceries"
// lists customer, partner and rider as separate Android clients, and the
// Google services Gradle plugin picks the client whose package_name matches
// the app being built. Re-download it from Firebase (Project settings →
// General → any Android app) whenever an app is added, and replace
// config/firebase/google-services.json — never keep per-app copies.
//
// It identifies the Firebase project and holds no secrets (Firebase's own
// guidance), so it is committed; EAS only uploads tracked files. The FCM
// service-account key is the secret one and never lives in the repo.
const fs = require('fs');
const path = require('path');

const SHARED_FILE = path.resolve(__dirname, '../../../config/firebase/google-services.json');

// Returns the path app.config.js should hand to android.googleServicesFile,
// relative to that app's directory, or undefined when the file is missing.
// GOOGLE_SERVICES_JSON (an EAS file env var) overrides it.
function googleServicesFile(appDir, packageName) {
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  if (!fs.existsSync(SHARED_FILE)) return undefined;
  const config = JSON.parse(fs.readFileSync(SHARED_FILE, 'utf8'));
  const registered = (config.client ?? []).some((c) => c.client_info?.android_client_info?.package_name === packageName);
  if (!registered) {
    throw new Error(`${packageName} is not registered in config/firebase/google-services.json — add the Android app in Firebase and re-download the file.`);
  }
  return path.relative(appDir, SHARED_FILE);
}

module.exports = { googleServicesFile };
