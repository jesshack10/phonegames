# Background alarms — the steps only you can do

The code is in place. These steps need your Firebase account and your
credentials, so they are yours to run. Nothing here is reversible-by-accident:
if you stop partway, the app keeps working exactly as it does today, with the
alarm control simply refusing to turn on.

## The short version

Upgrade the project to Blaze (step 1 below — it needs a card, so no script can
do it), then run:

```
cd functions && ./setup.sh
```

That handles the keys, the secrets, the deploy and the GitHub build secret in
one pass, and prints the one database rule you still have to paste in by hand.
The rest of this page is what the script does, in case you would rather do it
step by step or something goes wrong.

## 1. Upgrade the Firebase project to Blaze

Cloud Functions and Cloud Tasks need it. Firebase console → your project →
⚙️ Usage and billing → Details & settings → Modify plan → Blaze.

Blaze has a free monthly allowance far larger than one person's timer will
ever use, but it does require a card on file. Set a budget alert while you are
there if you want a safety net.

## 2. Generate the VAPID keys

These identify your app to Apple's and Google's push services.

```
cd functions
npm install
npm run vapid
```

It prints a public and a private key and tells you where each goes. **The
private key must never be committed or pasted into a chat** — it is the
credential that lets anyone push to your users.

## 3. Store the secrets

```
firebase functions:secrets:set VAPID_PUBLIC_KEY     # paste the public key
firebase functions:secrets:set VAPID_PRIVATE_KEY    # paste the private key
firebase functions:secrets:set VAPID_SUBJECT        # mailto:you@example.com
```

Then add the **public** key to GitHub so the web build can use it:
repo → Settings → Secrets and variables → Actions → New repository secret,
named `VITE_VAPID_PUBLIC_KEY`.

Re-run the deploy workflow afterwards, or push any commit — the key is baked
in at build time, so a build made before you add it will not have it.

## 4. Add the database rule

The app writes each pending alarm to `/pushAlarms/{uid}`. Add this to your
**existing** rules in Firebase console → Realtime Database → Rules, alongside
what is already there. Do not replace the whole file — the games depend on the
current rules, which is why this repo deliberately ships no `database.rules.json`.

```json
"pushAlarms": {
  "$uid": {
    ".read": "$uid === auth.uid",
    ".write": "$uid === auth.uid"
  }
}
```

## 5. Deploy the functions

```
cd functions
npm run deploy
```

This deploys two functions:

- `scheduleAlarm` — watches `/pushAlarms/{uid}` and books a Cloud Task for the
  exact deadline whenever a period starts.
- `deliverAlarm` — runs at that instant, re-checks that the alarm is still the
  one the app is waiting on, and sends the push.

## 6. Turn it on, on your phone

1. Open the site in Safari on the iPhone.
2. Share → **Add to Home Screen**. This is not optional: iOS only allows push
   for a PWA launched from the Home Screen, never from a Safari tab.
3. Open the app **from the Home Screen icon**.
4. Pomodoro → tap **🔔 Alarm when a period ends** → allow notifications.
5. Start a one-minute block, lock the phone, and wait.

## How it behaves

- The alarm is booked when a period starts and deleted when it stops. Pausing,
  splitting, or walking away all clear it.
- Cloud Tasks are never cancelled. The database record is the source of truth:
  when a task fires it re-reads the record and only sends if the deadline still
  matches, so a cancelled or replaced period cannot ring later.
- The notification is a real iOS notification, so it works with the app closed,
  the phone locked, and — unlike the in-app chime — regardless of the ringer
  switch, following your normal notification settings instead.
- The in-app chime still plays when the app is open. Both may fire if you are
  looking at the app when a period ends; that is deliberate, since the
  notification is the one you would otherwise miss.

## If it does not work

- **Alarm control refuses to turn on** — you are in a Safari tab, not the
  Home Screen app; or `VITE_VAPID_PUBLIC_KEY` was not set at build time.
- **Permission granted but nothing arrives** — check the `deliverAlarm` logs in
  the Firebase console. A `404`/`410` there means the subscription expired:
  toggle the alarm control off and on to resubscribe.
- **Nothing in the logs at all** — `scheduleAlarm` never ran, so the write to
  `/pushAlarms/{uid}` was rejected. Re-check the database rule in step 4.
