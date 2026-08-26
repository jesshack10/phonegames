#!/usr/bin/env node
/*
 * Generates the VAPID key pair for Web Push.
 *
 * Run this yourself: the private key must never be committed or pasted into a
 * chat. It goes into Firebase secrets; only the public key is safe to expose,
 * and the app needs it at build time.
 *
 *   cd functions && npm install && npm run vapid
 */
const webpush = require('web-push')
const { publicKey, privateKey } = webpush.generateVAPIDKeys()

console.log(`
VAPID keys generated. Keep the private key secret.

1) Store them as Firebase secrets (you will be prompted to paste each value):

   firebase functions:secrets:set VAPID_PUBLIC_KEY
   firebase functions:secrets:set VAPID_PRIVATE_KEY
   firebase functions:secrets:set VAPID_SUBJECT      # e.g. mailto:you@example.com

2) Add the PUBLIC key as a GitHub Actions secret named VITE_VAPID_PUBLIC_KEY
   (Settings → Secrets and variables → Actions) so the web build can use it.

PUBLIC  (safe to expose, goes in the build and in Firebase secrets):
${publicKey}

PRIVATE (Firebase secret only — never commit this):
${privateKey}
`)
