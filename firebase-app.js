import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot,
  enableIndexedDbPersistence, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function hasConfig(){
  return window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.projectId
    && !String(window.FIREBASE_CONFIG.apiKey).includes("TU_");
}

const ns = (window.DELIVERY_NAMESPACE || "default").toString().trim() || "default";

window.FirebaseRT = {
  enabled: false,
  uid: null,
  _db: null,

  async init(){
    if(!hasConfig()){
      console.warn("Firebase config no definido. Usando solo almacenamiento local.");
      return { enabled:false };
    }

    const app = initializeApp(window.FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);
    this._db = db;

    try{ await enableIndexedDbPersistence(db); } catch(e){ /* ignore */ }

    await signInAnonymously(auth);

    return await new Promise((resolve)=>{
      onAuthStateChanged(auth, (user)=>{
        if(!user){ resolve({ enabled:false }); return; }

        window.FirebaseRT.enabled = true;
        window.FirebaseRT.uid = user.uid;

        window.FirebaseRT._collection = (name) => collection(db, `namespaces/${ns}/users/${user.uid}/${name}`);
        window.FirebaseRT._addDoc = addDoc;
        window.FirebaseRT._deleteDoc = deleteDoc;
        window.FirebaseRT._doc = doc;
        window.FirebaseRT._query = query;
        window.FirebaseRT._orderBy = orderBy;
        window.FirebaseRT._onSnapshot = onSnapshot;
        window.FirebaseRT._serverTimestamp = serverTimestamp;

        resolve({ enabled:true, uid:user.uid });
      });
    });
  }
};
