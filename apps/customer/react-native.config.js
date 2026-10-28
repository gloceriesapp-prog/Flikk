// Custom UI is needed only for iOS app-targeted UPI. Android keeps its
// existing server-created, package-targeted intent implementation.
module.exports = {
  dependencies: { 'react-native-customui': { platforms: { android: null } } },
};
