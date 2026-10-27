const { withXcodeProject } = require('@expo/config-plugins');

const phaseName = '[Gloceries] Validate SDK privacy metadata';

function configurePrivacyBuildPhase(project) {
  const target = project.getFirstTarget();
  if (project.pbxItemByComment(phaseName, 'PBXShellScriptBuildPhase')) return project;
  const added = project.addBuildPhase([], 'PBXShellScriptBuildPhase', phaseName, target.uuid, {
    shellPath: '/bin/sh',
    alwaysOutOfDate: true,
    shellScript: 'set -eu; mkdir -p "${DERIVED_FILE_DIR}/GloceriesSwiftModuleCache"; SDKROOT="$(xcrun --sdk macosx --show-sdk-path)" xcrun --sdk macosx swift -module-cache-path "${DERIVED_FILE_DIR}/GloceriesSwiftModuleCache" "${SRCROOT}/../scripts/ios-sdk-privacy.swift" --normalize-razorpay "${PODS_ROOT}/razorpay-pod"',
  });
  // Validate before any vendor resources are copied or signed into the app.
  const buildPhases = target.firstTarget.buildPhases;
  const index = buildPhases.findIndex(phase => phase.value === added.uuid);
  if (index >= 0) buildPhases.unshift(...buildPhases.splice(index, 1));
  return project;
}

module.exports = config => withXcodeProject(config, mod => {
  mod.modResults = configurePrivacyBuildPhase(mod.modResults);
  return mod;
});
module.exports.configurePrivacyBuildPhase = configurePrivacyBuildPhase;
