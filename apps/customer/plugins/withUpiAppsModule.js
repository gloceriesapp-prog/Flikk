// The Android half of payments/upiIntent.ts's detection: a real native
// module (UpiAppsModule.kt) that queries PackageManager for every
// installed app declaring the standard NPCI `upi://` intent-filter,
// returning real name/package/launcher-icon data — not a hardcoded list.
// `android/` itself is gitignored (prebuild output, apps.customer's own
// .gitignore) and gets regenerated from scratch on `expo prebuild`, so
// this native code has to be delivered as a config plugin (same reason
// withUpiAppQueries.js exists for the manifest half) rather than hand-
// edited directly in android/ — a hand-edit is silently wiped by the next
// `--clean` prebuild, which is exactly what happened here before.
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const fs = require('fs');
const path = require('path');

const MODULE_KT = `package com.gloceries.customer.upiapps

import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayOutputStream

// Real device query — nothing fabricated. ACTION_VIEW + a bare "upi://pay"
// data URI is the exact intent-filter shape every NPCI-compliant UPI app
// (GPay, PhonePe, Paytm, BHIM, CRED, WhatsApp, and any other real UPI PSP
// app) registers; PackageManager.queryIntentActivities returns every app
// that actually declared it, so this list only ever contains genuinely
// installed UPI apps. The generic "upi" scheme <queries> entry
// (withUpiAppQueries.js) is what makes this query itself return anything
// at all on Android 11+ package-visibility rules — without it this
// silently returns empty regardless of what's installed.
class UpiAppsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "UpiApps"

  @ReactMethod
  fun getInstalledUpiApps(promise: Promise) {
    try {
      val pm = reactApplicationContext.packageManager
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"))
      val resolveInfos = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
      val seenPackages = HashSet<String>()
      val result: WritableArray = Arguments.createArray()

      for (info in resolveInfos) {
        val packageName = info.activityInfo.packageName
        // A single app can register multiple matching activities
        // (share sheet + main launcher, etc) — one entry per package.
        if (!seenPackages.add(packageName)) continue

        val label = info.loadLabel(pm).toString()
        val icon = drawableToBase64Png(info.loadIcon(pm))

        val map: WritableMap = Arguments.createMap()
        map.putString("name", label)
        map.putString("packageName", packageName)
        // The actual activity that resolved this intent — payments/
        // upiIntent.ts's openUpiApp needs BOTH packageName and this to
        // set an explicit Intent.component (via expo-intent-launcher's
        // className param). packageName alone does nothing there —
        // IntentLauncherModule.kt only ever sets intent.component when
        // className is also given, so without it the intent stays a
        // plain generic ACTION_VIEW and Android shows its own "Open
        // with" chooser instead of jumping straight into the one app
        // the customer actually tapped.
        map.putString("className", info.activityInfo.name)
        map.putString("icon", icon)
        result.pushMap(map)
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("UPI_APPS_ERROR", e)
    }
  }

  private fun drawableToBase64Png(drawable: Drawable): String {
    val bitmap = if (drawable is BitmapDrawable) {
      drawable.bitmap
    } else {
      val width = drawable.intrinsicWidth.coerceAtLeast(1)
      val height = drawable.intrinsicHeight.coerceAtLeast(1)
      val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bmp)
      drawable.setBounds(0, 0, canvas.width, canvas.height)
      drawable.draw(canvas)
      bmp
    }
    val stream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
    return Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
  }
}
`;

const PACKAGE_KT = `package com.gloceries.customer.upiapps

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class UpiAppsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(UpiAppsModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;

function withUpiAppsModuleSource(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const pkgPath = config.modResults.package ?? config.android.package;
      const dir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java',
        ...pkgPath.split('.'),
        'upiapps',
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'UpiAppsModule.kt'), MODULE_KT);
      fs.writeFileSync(path.join(dir, 'UpiAppsPackage.kt'), PACKAGE_KT);
      return config;
    },
  ]);
}

function withUpiAppsModuleRegistration(config) {
  return withMainApplication(config, (config) => {
    const pkgPath = config.android.package;
    config.modResults.contents = mergeContents({
      tag: 'upi-apps-package',
      src: config.modResults.contents,
      newSrc: `          add(${pkgPath}.upiapps.UpiAppsPackage())`,
      anchor: /PackageList\(this\)\.packages\.apply \{/,
      offset: 1,
      comment: '//',
    }).contents;
    return config;
  });
}

module.exports = function withUpiAppsModule(config) {
  config = withUpiAppsModuleSource(config);
  config = withUpiAppsModuleRegistration(config);
  return config;
};
