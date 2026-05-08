# Phone Games + Money Manager

A mobile-first React app with party games and a personal expense tracker.

---

## Money Manager setup

The Money Manager uses **Firebase Realtime Database** with anonymous auth — no login required. Each device gets its own anonymous user ID and its data is stored privately under that ID.

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**.
2. Give it a name (e.g. `phonegames`), disable Google Analytics if you don't need it, click **Create project**.

### 2. Enable Anonymous Authentication

1. In the left sidebar go to **Build → Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Anonymous** and toggle it **on**. Save.

### 3. Create a Realtime Database

1. In the left sidebar go to **Build → Realtime Database**.
2. Click **Create database**.
3. Choose a region (e.g. `us-central1`), click **Next**.
4. Start in **test mode** (you can tighten rules later), click **Enable**.
5. Copy the database URL shown — it looks like:
   `https://your-project-id-default-rtdb.firebaseio.com`

### 4. Get your Firebase config

1. In the left sidebar click the **gear icon ⚙️** next to "Project Overview" → **Project settings**.
2. Scroll down to **Your apps**, click the `</>` Web icon to register a web app.
3. Give it a nickname and click **Register app**.
4. Copy the `firebaseConfig` object shown — you'll need the values in the next step.

### 5. Configure environment variables

In the project root, copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` and replace each placeholder:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

All seven values come from the `firebaseConfig` object in the Firebase console.

### 6. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in a mobile-sized browser window (DevTools → device toolbar).

From the home screen tap **💰 Money Manager** — on first load it seeds two default accounts (Cash, Bank) and seven expense categories.

---

## Database security rules (optional, recommended before sharing)

By default the Realtime Database is in test mode (open). To lock it down so each user can only read/write their own data, go to **Realtime Database → Rules** and paste:

```json
{
  "rules": {
    "money": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

Click **Publish**.

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy that folder to any static host (Netlify, Vercel, Firebase Hosting, GitHub Pages, etc.).

For Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # set public dir to "dist", configure as SPA
firebase deploy
```
