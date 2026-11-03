/* ===== LOCATION CONFIG: the only file a new store changes (see NEW-LOCATION.md) =====
   These Firebase values are safe to be public: they only say WHICH Firebase project to talk to.
   The security rules (firestore.rules) are what decide who can read and write.
   Never put passwords, pay, SSNs, bank details or private keys anywhere in this site. */
window.FOH_CONFIG={
  locationName:'The Yardery',       // shown at the top of the page
  locationId:'sanford',             // lowercase letters, numbers, dashes. Each store's checks are saved under its own id.
  timeZone:'America/New_York',      // the store's time zone
  dayCutoffHour:5,                  // before 5 AM still counts as the previous day, to match the close
  firebase:{                        // paste from Firebase: Project settings > Your apps > SDK setup and configuration > Config
    apiKey:'AIzaSyCD8n6TN153n52Uh5V2oOXcBzqo3lPRMjU',
    authDomain:'yardery-foh.firebaseapp.com',
    projectId:'yardery-foh',
    storageBucket:'yardery-foh.firebasestorage.app',
    messagingSenderId:'588087483594',
    appId:'1:588087483594:web:6d29a5766f420cfce46833'
  },
  managers:[                        // manager device ids (can uncheck anyone). Must match managerIds() in firestore.rules.
    'TjGZ7fcbmAgo4y2skvQPfuH4fJB2'   // Clay
  ],
  appCheckSiteKey:''                // optional extra lock (reCAPTCHA v3 site key); leave empty unless set up
};
