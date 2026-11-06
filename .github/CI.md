# CI selection and recovery

Pull requests run CI once. Superseded PR runs are cancelled; pushes to `main`
run the entire suite so Lightsail's exact-commit CI dependency remains intact.
Android production builds are manual and retain their signing, version-code and
reviewed-default-branch safeguards.

## Cross-app dependencies

- Backend tests import customer, admin, partner, rider and partner-dashboard code.
  Changes in any of those directories must select backend tests.
- Admin imports backend store validation, so backend changes select web checks.
- Backend changes select SQL security tests, including changes in authorization
  code that may affect database access without changing a migration.
- Shared packages, root dependencies/patches, CI scripts, workflow files and
  native configuration select every suite. Documentation-only changes can skip
  app jobs after successful change detection.

`ci-gate` is the final result check. A required job must succeed; an unselected
job can succeed or be skipped. A failed filter, missing filter output, missing
job result, failure or cancellation cannot produce a successful final gate.
The gate has regression coverage in `scripts/ci-gate.test.mjs`.

## Local verification

```sh
node --test scripts/ci-gate.test.mjs
actionlint .github/workflows/ci.yml .github/workflows/customer-android-release.yml .github/workflows/partner-android-release.yml
git diff --check
```

Also check path selection when changing filters: partner code selects backend
and mobile; partner-dashboard selects backend and web; backend selects backend,
SQL and web; customer selects backend and customer; shared/config/workflow
changes select all five groups; documentation alone selects none.

## Account-level failures

On 6 November 2026, the latest runs for PRs #140 and #141 were rejected before
runner startup. GitHub's annotation explicitly reported failed account payments
or an insufficient spending limit. There are no test logs for jobs that never
started. A repository/account owner must resolve the account billing issue;
changing workflow code or repeatedly rerunning cannot resolve it.

Vercel also reported blocked deployments because the commit author `Nishal77`
was not an authorized member of the Gloceries team. The owner must verify the
intended GitHub-to-Vercel account connection and legitimate team access. Do not
make the private repository public, forge commit authorship, bypass checks or
change a paid plan merely to make checks green.

After access is restored, rerun CI once on the latest PR commit and retry the
blocked Vercel deployments. Inspect actual job logs for any subsequent code
failures. A local workflow validation pass does not mean hosted app builds or
tests have passed. Merge only after those checks are verified; production
migrations and deployment are separate actions.
