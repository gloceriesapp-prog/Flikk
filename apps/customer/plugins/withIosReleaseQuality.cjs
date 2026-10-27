const { withXcodeProject } = require('@expo/config-plugins');

const phaseName = '[Gloceries] Validate SDK privacy metadata';
const privacyScript = 'set -eu; mkdir -p "${DERIVED_FILE_DIR}/GloceriesSwiftModuleCache"; export SDKROOT="$(xcrun --sdk macosx --show-sdk-path)"; xcrun --sdk macosx swift -module-cache-path "${DERIVED_FILE_DIR}/GloceriesSwiftModuleCache" "${SRCROOT}/../scripts/ios-sdk-privacy.swift" --normalize-razorpay "${PODS_ROOT}/razorpay-pod"; xcrun --sdk macosx swift -module-cache-path "${DERIVED_FILE_DIR}/GloceriesSwiftModuleCache" "${SRCROOT}/../scripts/ios-sdk-privacy.swift" --normalize-razorpay "${PODS_XCFRAMEWORKS_BUILD_DIR}/razorpay-pod"';

function configurePrivacyBuildPhase(project) {
  const target = project.getFirstTarget();
  const existing = project.pbxItemByComment(phaseName, 'PBXShellScriptBuildPhase');
  if (existing) {
    existing.shellScript = JSON.stringify(privacyScript);
    return project;
  }
  const added = project.addBuildPhase([], 'PBXShellScriptBuildPhase', phaseName, target.uuid, {
    shellPath: '/bin/sh',
    alwaysOutOfDate: true,
    shellScript: privacyScript,
  });
  // Validate before any vendor resources are copied or signed into the app.
  const buildPhases = target.firstTarget.buildPhases;
  const index = buildPhases.findIndex(phase => phase.value === added.uuid);
  if (index >= 0) buildPhases.unshift(...buildPhases.splice(index, 1));
  return project;
}

function configureRuntimeBuildPhase(project) {
  const name = '[Gloceries] Verify bundled runtimes';
  if (project.pbxItemByComment(name, 'PBXShellScriptBuildPhase')) return project;
  const target = project.getFirstTarget();
  const phases = target.firstTarget.buildPhases;
  const bundleIndex = phases.findIndex(phase => /Bundle React Native code and images/.test(phase.comment ?? ''));
  if (bundleIndex < 0) throw new Error('Missing React Native bundle phase; cannot verify release runtimes.');
  const added = project.addBuildPhase([], 'PBXShellScriptBuildPhase', name, target.uuid, {
    shellPath: '/bin/sh',
    alwaysOutOfDate: true,
    shellScript: 'set -eu; if [ "$CONFIGURATION" != "Release" ]; then exit 0; fi; if [ -f "$SRCROOT/.xcode.env" ]; then . "$SRCROOT/.xcode.env"; fi; if [ -f "$SRCROOT/.xcode.env.local" ]; then . "$SRCROOT/.xcode.env.local"; fi; "${NODE_BINARY:-node}" "$SRCROOT/../scripts/verify-bundle-singletons.cjs" "$DERIVED_FILE_DIR/main.jsbundle.map"',
  });
  const index = phases.findIndex(phase => phase.value === added.uuid);
  if (index >= 0) phases.splice(bundleIndex + 1, 0, ...phases.splice(index, 1));
  return project;
}

module.exports = config => withXcodeProject(config, mod => {
  mod.modResults = configurePrivacyBuildPhase(mod.modResults);
  mod.modResults = configureRuntimeBuildPhase(mod.modResults);
  return mod;
});
module.exports.configurePrivacyBuildPhase = configurePrivacyBuildPhase;
module.exports.configureRuntimeBuildPhase = configureRuntimeBuildPhase;
