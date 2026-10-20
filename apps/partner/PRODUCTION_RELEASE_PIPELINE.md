# Partner signed Android releases

The manual **Partner Android Release** GitHub workflow builds the existing
React Native/Expo app directly with Gradle. It does not call EAS Build or
automatically upload/promote a Google Play release.

## One-time repository-admin setup

Merge the reviewed release changes and this workflow into the repository's
default branch. `workflow_dispatch` becomes available after the workflow is
on that branch. Source validation runs on the workflow's PR without signing
credentials; production builds run only from the default branch.

Create the GitHub environment `partner-android-production`, restricted to
the default branch (`main`). Keep any additional reviewer requirements your
organization chooses. Do not use the existing web deployment environments.

Configure these **environment secrets**:

| Secret | Source |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 of the existing Partner upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Existing keystore password |
| `ANDROID_KEY_ALIAS` | Existing key alias |
| `ANDROID_KEY_PASSWORD` | Existing key password |
| `GOOGLE_MAPS_API_KEY` | Existing native Android Maps SDK key, not a backend geocoding/Routes key |
| `SENTRY_AUTH_TOKEN` | Valid Sentry upload token for the Partner organization/project |

Configure these **environment variables**:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://flikk-production.up.railway.app` |
| `EXPO_PUBLIC_SENTRY_DSN` | Existing production Partner DSN |
| `SENTRY_ORG` | Existing Sentry organization slug |
| `SENTRY_PROJECT` | Existing Partner Sentry project slug |
| `ANDROID_UPLOAD_CERT_SHA256` | `4408C2206DED628D6888218C90DD9FCFEE7A7F7A018ECEA827910AA84B72DAD8` |

The certificate fingerprint is public metadata verified against the existing
EAS production upload credentials. This is the upload certificate, not the
Google Play app-signing certificate used on end-user installations.

Download existing credentials, if needed, from `apps/partner` with
`eas credentials -p android`: production → credentials.json → Download.
Keep the downloaded keystore and JSON private and outside tracked source.
An Expo Secret-only token cannot be exported; supply a retained valid Sentry
token or create an appropriate upload token in Sentry. A cloud build quota
does not prevent downloading existing signing credentials.

An admin can configure the environment in one command instead of copying
credentials manually. Set the required API/Maps/Sentry values in that local
process's environment, authenticate `gh` as a repository admin, then run:

```sh
chmod 600 /absolute/private/path/credentials.json
node scripts/configure-partner-release.cjs /absolute/private/path/credentials.json
```

The script checks access, configuration, keystore certificate and branch
restrictions before storing secrets. It reads secret bodies through stdin,
prints names rather than values, and preserves existing review protections.
It does not dispatch a release, merge a PR or publish to Play.

## Devin environment

Connect `gloceriesapp-prog/Flikk` in Devin Settings → Connections → GitHub.
In Environment settings, sync the repository's git-backed
`.devin/blueprint.yaml` from the reviewed branch. The blueprint installs Node
22, JDK 17, Android SDK/build-tools 36, NDK 27.1.12297006 and locked workspace
dependencies. It includes the Partner lint/test/build instructions.

The blueprint is versioned source, not proof that a Devin account has been
connected or its snapshot has built. Confirm a successful snapshot in Devin
after connecting the repository. Production signing/Sentry tokens remain in
GitHub's production environment; they are not baked into Devin's snapshot.
If interactive map testing in Devin is needed, configure an appropriately
restricted development Maps key for its package/certificate separately.

## Create a release

1. Review every track in Play Console and note the highest uploaded version
   code, including drafts/internal releases. The workflow cannot read Play
   Console and relies on the operator's confirmed value.
2. Open GitHub → Actions → **Partner Android Release** → Run workflow.
3. Select `main`. Supply `highest_play_version_code` and a strictly larger
   `version_code`. The marketing/runtime version comes from the reviewed
   Partner app configuration/package; update both together for native changes.
4. Wait for source checks, Sentry authentication, backend health, prebuild,
   signing, native tests, all configured ABIs, R8 and release verification.
5. Download the successful workflow artifact. It contains:
   - `partner-<version>-<code>.aab`
   - `mapping.txt`
   - `SHA256SUMS`
   - `release-verification.json`
   - optimizer verification and redacted build logs

Artifacts expire after 14 days; retain approved releases in company storage.
Failed builds retain only an available redacted Gradle log for seven days.
Private keystores, raw manifests, dotenv files and credentials JSON are not
uploaded. Temporary signing material is removed even when a build fails.

## Verification and publication

The gate checks the actual AAB signature against the expected upload
certificate, published package, operator-supplied version code, marketing
version, non-debuggable flag, packaged Maps key, production Updates project
and channel header, production API in the JS bundle, four configured ABIs,
and the existing R8/resource-shrinking/reflection-constructor checks.

This proves artifact properties, not runtime correctness. Upload the signed
AAB to Play Internal Testing and test the Play-installed app on Android 15+
and a large screen, including maps, notifications, populated order/product
flows, session persistence and update behavior. The isolated validation
package had a different certificate and was not authorized for production
map tiles; a successful Gradle build does not clear that runtime test.

After internal testing, manually approve a staged Play rollout and monitor
Sentry/Play vitals. No Play service-account credential is needed for this
build-only workflow. Automated submission can be added as a separately
reviewed change later.

References: [Devin blueprints](https://docs.devin.ai/onboard-devin/environment/blueprint-reference),
[GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments),
[Expo credentials](https://docs.expo.dev/app-signing/syncing-credentials/),
[Android release builds](https://developer.android.com/build/building-cmdline).
