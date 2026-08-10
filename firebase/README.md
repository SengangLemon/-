# Nonet Firebase Sync

Nonet v10 uses the existing Firebase project `microchronos-3dd02`.

## Synced private data

- Personal hub boards
- Private study pack, including linear algebra and modern algebra
- Review status and due dates

Built-in lunch, dinner, dessert boards and public starter templates remain static app assets and are not written to Firestore.

## Firestore location

The app writes only the `nonet` field inside:

```text
users/{firebaseAuthUid}
```

Writes use `setDoc(..., { merge: true })`, so unrelated MicroChronos fields in the same document are preserved.

## Console setup

1. Firebase Console → Authentication → Sign-in method
   - Enable Google
   - Enable Email/Password
2. Authentication → Settings → Authorized domains
   - Add `nonet-study.vercel.app`
   - Add `sigma-swart-49.vercel.app`
   - Add any future production domain
3. Firestore Database → Rules
   - Merge the `users/{userId}` rule from `nonet-firestore.rules` into the existing rules

## First login migration

At first login, the app merges the current browser's local data with existing cloud data, uploads the merged result, and starts a realtime listener. Later changes are debounced and written automatically.

## Conflict behavior

- Boards are merged by board ID and `updatedAt`
- Review entries are merged by key and `updatedAt`
- Study packs use the newer pack `updatedAt`
- Firestore realtime sync is last-write-wins after the initial merge

## Size guard

The current implementation stores the Nonet workspace in one user document for compatibility with the existing `users/{uid}` rules. It refuses writes above 850 KB. If a user's workspace approaches that size, migrate boards to a subcollection in a future schema version.
