// EAS production builds cannot silently ship without release configuration.
if (process.env.EAS_BUILD_PROFILE === 'production') require('./verify-release.cjs');
