/* ============================================================
   TASTE OF TERRA — firebase.js — FIXED v4
   Fix 1: uploadAvatar — pastikan currentUser di auth tidak null
   Fix 2: countByUser — ambil dari Firestore langsung, bukan dari allIds
   Fix 3: CommentService.delete — hapus komentar/balasan spesifik
   Fix 4: CommentService.addReply — balas komentar (subcollection replies)
   Fix 5: CommentService.onCommentsChanged — sertakan replies tiap komentar
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAsNVecLRKWRS_EWy4jxVl0vnVKvNbmuIw",
  authDomain:        "taste-of-terra-2.firebaseapp.com",
  projectId:         "taste-of-terra-2",
  storageBucket:     "taste-of-terra-2.firebasestorage.app",
  messagingSenderId: "112961639017",
  appId:             "1:112961639017:web:66dd844aebd0e80bab08f8",
  measurementId:     "G-43BXNBETQZ"
};

firebase.initializeApp(FIREBASE_CONFIG);

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

// ================================================================
//  AUTH SERVICE
// ================================================================
const AuthService = {

  async register(email, password, name, bday) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const uid  = cred.user.uid;
    await cred.user.updateProfile({ displayName: name });
    await db.collection('users').doc(uid).set({
      uid, name, email, bday,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { uid, name, email, bday };
  },

  async login(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const uid  = cred.user.uid;
    const doc  = await db.collection('users').doc(uid).get();
    return { uid, email, ...doc.data() };
  },

  async logout() {
    await auth.signOut();
  },

  onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(async (user) => {
      if (user) {
        const doc = await db.collection('users').doc(user.uid).get();
        callback({ uid: user.uid, email: user.email, ...doc.data() });
      } else {
        callback(null);
      }
    });
  },

  async updateUser(uid, updates) {
    // Simpan ke Firestore
    await db.collection('users').doc(uid).update(updates);
    // Update Firebase Auth displayName jika ada perubahan nama
    if (updates.name) {
      const authUser = auth.currentUser;
      if (authUser) {
        try { await authUser.updateProfile({ displayName: updates.name }); }
        catch(e) { console.warn('updateProfile gagal:', e.message); }
      }
    }
    // Kembalikan data terbaru dari Firestore agar caller bisa sinkronkan state
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? { uid, email: auth.currentUser?.email, ...doc.data() } : null;
  },

  // FIX 1 v5: uploadAvatar — coba Storage dulu, fallback base64 jika gagal
  async uploadAvatar(uid, file) {
    const user = auth.currentUser;
    if (!user) throw new Error('Belum login');

    // Kompres dulu
    const compressed = await _compressImage(file, 400, 0.8);

    let url;
    try {
      // Coba upload ke Firebase Storage
      const base64Data = compressed.split(',')[1];
      const byteChars  = atob(base64Data);
      const byteArr    = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: 'image/jpeg' });

      const ref      = storage.ref(`avatars/${uid}_${Date.now()}.jpg`);
      const snapshot = await Promise.race([
        ref.put(blob),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))
      ]);
      url = await snapshot.ref.getDownloadURL();
    } catch (storageErr) {
      console.warn('Storage avatar gagal, fallback base64:', storageErr.message);
      // Fallback: simpan base64 langsung ke Firestore
      url = await _compressImage(file, 200, 0.7); // lebih kecil untuk Firestore
    }

    await db.collection('users').doc(uid).update({ avatarUrl: url });
    return url;
  },

  async getAvatarUrl(uid) {
    if (!uid) return null;
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? (doc.data().avatarUrl || null) : null;
  }
};

// Helper kompres gambar (dipakai AuthService & RecipeService)
function _compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
window._compressImage = _compressImage;

// ================================================================
//  RECIPE SERVICE
// ================================================================
const RecipeService = {

  async addDirect(recipeData) {
   const docRef = await db.collection('recipes').add({
  name:        recipeData.name,
  desc:        recipeData.desc,
  ingredients: recipeData.ingredients,
  steps:       recipeData.steps,
  author:      recipeData.author,
  authorId:    recipeData.authorId,
  image:       recipeData.image || null,
  category:    recipeData.category || 'dessert',   // ✅ tambahkan ini
  createdAt:   firebase.firestore.FieldValue.serverTimestamp()
});
    return { id: docRef.id, ...recipeData };
  },

  async add(recipeData, imageFile) {
    let imageUrl = recipeData.image || null;
    if (imageFile) {
      const ext      = imageFile.name.split('.').pop();
      const ref      = storage.ref(`recipes/${Date.now()}_${recipeData.authorId}.${ext}`);
      const snapshot = await ref.put(imageFile);
      imageUrl       = await snapshot.ref.getDownloadURL();
    }
    const docRef = await db.collection('recipes').add({
      name:        recipeData.name,
      desc:        recipeData.desc,
      ingredients: recipeData.ingredients,
      steps:       recipeData.steps,
      author:      recipeData.author,
      authorId:    recipeData.authorId,
      image:       imageUrl,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });
    return { id: docRef.id, ...recipeData, image: imageUrl };
  },

  onRecipesChanged(onUpdate) {
    return db.collection('recipes')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const recipes = [];
        snapshot.forEach(doc => recipes.push({ id: doc.id, ...doc.data() }));
        onUpdate(recipes);
      });
  },

  async getById(id) {
    const doc = await db.collection('recipes').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async delete(id) {
    const doc = await db.collection('recipes').doc(id).get();
    if (doc.exists && doc.data().image && doc.data().image.startsWith('https://firebasestorage')) {
      try { await storage.refFromURL(doc.data().image).delete(); }
      catch (e) { console.warn('Gagal hapus gambar storage:', e); }
    }
    await db.collection('recipes').doc(id).delete();
    // Hapus semua komentar & balasan terkait
    const cmts  = await db.collection('comments').doc(id).collection('items').get();
    const batch = db.batch();
    // Hapus replies tiap komentar juga
    for (const c of cmts.docs) {
      const replies = await db.collection('comments').doc(id)
        .collection('items').doc(c.id).collection('replies').get();
      replies.forEach(r => batch.delete(r.ref));
      batch.delete(c.ref);
    }
    await batch.commit();
  },

  async getByUser(uid) {
    const snap = await db.collection('recipes')
      .where('authorId', '==', uid)
      .get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    return docs;
  }
};

// ================================================================
//  COMMENT SERVICE
// ================================================================
const CommentService = {

  async add(recipeId, commentData) {
    await db.collection('comments').doc(recipeId)
      .collection('items').add({
        ...commentData,
        at: firebase.firestore.FieldValue.serverTimestamp()
      });
  },

  // FIX 3: Hapus komentar spesifik (dan semua replynya)
  async deleteComment(recipeId, commentId) {
    const replies = await db.collection('comments').doc(recipeId)
      .collection('items').doc(commentId).collection('replies').get();
    const batch = db.batch();
    replies.forEach(r => batch.delete(r.ref));
    batch.delete(db.collection('comments').doc(recipeId).collection('items').doc(commentId));
    await batch.commit();
  },

  // FIX 3: Hapus balasan spesifik
  async deleteReply(recipeId, commentId, replyId) {
    await db.collection('comments').doc(recipeId)
      .collection('items').doc(commentId)
      .collection('replies').doc(replyId).delete();
  },

  // FIX 4: Balas komentar — simpan ke subcollection replies
  async addReply(recipeId, commentId, replyData) {
    await db.collection('comments').doc(recipeId)
      .collection('items').doc(commentId)
      .collection('replies').add({
        ...replyData,
        at: firebase.firestore.FieldValue.serverTimestamp()
      });
  },

  // FIX 5: onCommentsChanged — load replies tiap komentar secara paralel
  onCommentsChanged(recipeId, onUpdate) {
    return db.collection('comments').doc(recipeId)
      .collection('items')
      .orderBy('at', 'asc')
      .onSnapshot(async snapshot => {
        const cmts = [];
        for (const doc of snapshot.docs) {
          const data = { id: doc.id, ...doc.data(), replies: [] };
          try {
            const repSnap = await db.collection('comments').doc(recipeId)
              .collection('items').doc(doc.id)
              .collection('replies').orderBy('at', 'asc').get();
            data.replies = repSnap.docs.map(r => ({ id: r.id, ...r.data() }));
          } catch (_) {}
          cmts.push(data);
        }
        onUpdate(cmts);
      });
  },

  async getAll(recipeId) {
    const snap = await db.collection('comments').doc(recipeId)
      .collection('items').orderBy('at', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // countByUser — 3 strategi bertingkat agar selalu ada angka
  // Strategi 1: collectionGroup (butuh index Firestore)
  // Strategi 2: iterasi semua resep, query komentar per resep
  // Strategi 3: kembalikan 0 daripada crash
  async countByUser(uid, recipeIds = []) {
    if (!uid) return 0;

    // Strategi 1: collectionGroup query
    try {
      const snap = await db.collectionGroup('items')
        .where('uid', '==', uid).get();
      return snap.size;
    } catch (e) {
      console.warn('countByUser collectionGroup gagal, coba fallback:', e.message);
    }

    // Strategi 2: iterasi per resep (pakai recipeIds yang dikirim dari app)
    if (recipeIds && recipeIds.length > 0) {
      try {
        let total = 0;
        // Batasi 20 resep pertama agar tidak terlalu banyak request
        const ids = recipeIds.slice(0, 20);
        const results = await Promise.allSettled(
          ids.map(id =>
            db.collection('comments').doc(id)
              .collection('items').where('uid', '==', uid).get()
          )
        );
        results.forEach(r => {
          if (r.status === 'fulfilled') total += r.value.size;
        });
        return total;
      } catch (e2) {
        console.warn('countByUser fallback per-resep gagal:', e2.message);
      }
    }

    return 0;
  }
};

window.AuthService    = AuthService;
window.RecipeService  = RecipeService;
window.CommentService = CommentService;
window.storage        = storage;
window._compressImage = _compressImage;

console.log('🔥 Firebase ready!');