const { withPodfile } = require('@expo/config-plugins');

// These Standard and Custom releases share Core 1.0.9. Older Standard
// releases pin Core 1.0.6 and cannot coexist with app-targeted Custom UPI.
function configurePodfile(contents) {
  const marker = "  # Gloceries iOS UPI SDK versions\n  pod 'razorpay-pod', '1.5.9'\n  pod 'razorpay-customui-pod', '2.2.3'\n";
  if (contents.includes('# Gloceries iOS UPI SDK versions')) return contents;
  const target = /target ['"][^'"]+['"] do\n/;
  if (!target.test(contents)) throw new Error('Missing iOS app target for Razorpay UPI configuration.');
  return contents.replace(target, match => match + marker);
}

module.exports = config => withPodfile(config, mod => {
  mod.modResults.contents = configurePodfile(mod.modResults.contents);
  return mod;
});
module.exports.configurePodfile = configurePodfile;
