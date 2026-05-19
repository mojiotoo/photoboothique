const firebaseConfig = {
    apiKey: "AIzaSyACl9gN0aCFq6djIc1Vkex8HQ05-XtOH24",
    authDomain: "photoboothique-6ebcb.firebaseapp.com",
    projectId: "photoboothique-6ebcb",
    storageBucket: "photoboothique-6ebcb.firebasestorage.app",
    messagingSenderId: "972033939577",
    appId: "1:972033939577:web:fd861ff0bfad93a0c11ca8",
    measurementId: "G-1GZMTV1DPR",
};

if (window.firebase && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.firebaseConfig = firebaseConfig;
