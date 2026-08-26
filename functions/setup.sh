#!/usr/bin/env bash
#
# One-shot setup for background alarms.
#
# Does everything that can be automated: generates the VAPID keys, stores them
# as Firebase secrets, deploys the functions, and (if the GitHub CLI is
# available) sets the build secret too.
#
# It cannot do the two things that need a human: upgrading the project to the
# Blaze plan, and adding the database rule. It checks for the first and prints
# the second.
#
#   cd functions && ./setup.sh
#
set -euo pipefail

FIREBASE="npx --yes firebase-tools@latest"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null || fail "Node is required. Install it and run this again."

say "1/6  Signing in to Firebase"
$FIREBASE login

PROJECT="${FIREBASE_PROJECT:-}"
if [ -z "$PROJECT" ]; then
  say "Which Firebase project? (the one the app already uses)"
  $FIREBASE projects:list
  read -r -p "Project ID: " PROJECT
fi
[ -n "$PROJECT" ] || fail "No project chosen."

say "2/6  Installing function dependencies"
npm install --silent

say "3/6  Generating VAPID keys"
# Kept in shell variables and piped straight into the secret store — the
# private key is never written to disk or echoed to the terminal.
KEYS="$(node -e '
const w = require("web-push");
const k = w.generateVAPIDKeys();
process.stdout.write(k.publicKey + "\n" + k.privateKey);
')"
VAPID_PUBLIC="$(printf '%s' "$KEYS" | head -n 1)"
VAPID_PRIVATE="$(printf '%s' "$KEYS" | tail -n 1)"
[ -n "$VAPID_PUBLIC" ] && [ -n "$VAPID_PRIVATE" ] || fail "Key generation failed."

SUBJECT="${VAPID_SUBJECT:-}"
if [ -z "$SUBJECT" ]; then
  read -r -p "Contact address for push services (e.g. mailto:you@example.com): " SUBJECT
fi
case "$SUBJECT" in
  mailto:*|https://*) ;;
  *@*) SUBJECT="mailto:$SUBJECT" ;;
  *) fail "That needs to be an email or URL, e.g. mailto:you@example.com" ;;
esac

say "4/6  Storing the secrets in Firebase"
printf '%s' "$VAPID_PUBLIC"  | $FIREBASE functions:secrets:set VAPID_PUBLIC_KEY  --data-file - --project "$PROJECT"
printf '%s' "$VAPID_PRIVATE" | $FIREBASE functions:secrets:set VAPID_PRIVATE_KEY --data-file - --project "$PROJECT"
printf '%s' "$SUBJECT"       | $FIREBASE functions:secrets:set VAPID_SUBJECT     --data-file - --project "$PROJECT"

say "5/6  Deploying the functions"
if ! $FIREBASE deploy --only functions --project "$PROJECT"; then
  fail "Deploy failed.
If it mentions billing, the project is still on the Spark plan. Cloud Functions
and Cloud Tasks need Blaze — upgrade it in the Firebase console under
Usage and billing, then run this script again. Your secrets are already saved,
so it will pick up where it left off."
fi

say "6/6  The build secret"
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh secret set VITE_VAPID_PUBLIC_KEY --body "$VAPID_PUBLIC"
  echo "Set VITE_VAPID_PUBLIC_KEY on the repo via the GitHub CLI."
  echo "Re-run the deploy workflow so the web build picks it up:"
  echo "  gh workflow run 'Deploy to GitHub Pages'"
else
  cat <<TXT
The GitHub CLI isn't available, so add this by hand:

  repo → Settings → Secrets and variables → Actions → New repository secret
  Name:  VITE_VAPID_PUBLIC_KEY
  Value: $VAPID_PUBLIC

Then re-run the "Deploy to GitHub Pages" workflow — the key is baked in at
build time, so an older build will not have it.
TXT
fi

cat <<'TXT'

One thing left that has to be done by hand
------------------------------------------
Firebase console → Realtime Database → Rules. ADD this alongside your existing
rules — do not replace the file, the games depend on what is already there:

  "pushAlarms": {
    "$uid": {
      ".read": "$uid === auth.uid",
      ".write": "$uid === auth.uid"
    }
  }

Then on the iPhone: Share → Add to Home Screen, open the app from that icon,
Pomodoro → tap the alarm control → allow notifications. Start a one-minute
block, lock the phone, and wait.
TXT
