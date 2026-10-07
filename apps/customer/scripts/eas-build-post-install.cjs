// EAS release builds (preview + production) cannot silently ship without release configuration.
if (['production', 'preview'].includes(process.env.EAS_BUILD_PROFILE)) require('./verify-release.cjs');
