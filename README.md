# Delivery Diario (PWA)

App web simple (sin backend) para registrar deliveries por día.

## Cómo usar
- Escribí **Nombre y ubicación** (un solo campo).
- Tocá el monto (Gs 5.000 / 7.000 / 10.000 / 20.000).
- Guardar. Se agrega la fecha/hora automáticamente.

## Publicar en GitHub Pages
1. Subí el contenido de esta carpeta a un repositorio.
2. En GitHub: Settings → Pages → Deploy from a branch → seleccioná `main` y `/ (root)`.
3. Abrí el link del Pages desde el celular y tocá **Instalar**.

## Notas
- Guarda en `localStorage` del navegador: si borrás datos del navegador, se pierde.
- Funciona offline gracias al service worker.


## Firebase (tiempo real + multi-dispositivo)
Esta versión soporta sincronización en tiempo real usando **Cloud Firestore** + **Auth anónimo**.

### Configuración
1) Firebase Console → creá proyecto  
2) Authentication → Sign-in method → **Anonymous: Enable**  
3) Firestore Database → **Create database**  
4) Pegá tu config web en `firebase-config.js` (reemplazá los "TU_...")  
5) Publicá en GitHub Pages como siempre

### Reglas recomendadas (IMPORTANTE)
Para que cada usuario (dispositivo) vea SOLO sus datos:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /namespaces/{ns}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
