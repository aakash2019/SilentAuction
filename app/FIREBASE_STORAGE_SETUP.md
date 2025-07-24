# Firebase Storage Setup Instructions

## The storage error you're seeing is likely because Firebase Storage is not properly configured. Here's how to fix it:

### 1. Enable Firebase Storage
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `silent-auction-81fc9`
3. Click on "Storage" in the left sidebar
4. Click "Get started" if Storage is not enabled
5. Choose "Start in test mode" for now (you can change rules later)
6. Select a location (choose one close to your users)

### 2. Configure Storage Rules
1. In Firebase Console -> Storage -> Rules tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload/read items
    match /items/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Alternative: Test Mode Rules (Less Secure - Only for Development)
If you want to test without authentication checks:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // WARNING: Only use for testing - allows anyone to read/write
    match /{allPaths=**} {
      allow read, write;
    }
  }
}
```

### 4. Verify Storage Bucket URL
Make sure your `firebase.js` has the correct storage bucket URL:
```javascript
storageBucket: "silent-auction-81fc9.firebasestorage.app"
```

### 5. Test the Setup
After configuring, try adding an item again. The app now has fallback logic to use local URIs if cloud storage fails, so it will work either way for testing.

### 6. Production Rules (More Secure)
For production, use more restrictive rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /items/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admin/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

This ensures only authenticated admins can upload items to storage.
