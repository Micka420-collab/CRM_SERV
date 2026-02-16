# Correction du Déploiement Railway

## ❌ Problème
Erreur Prisma : Relation manquante entre `Device` et `AppVersion`

## ✅ Solution appliquée
Ajout de la relation inverse `targetDevices` dans le modèle `AppVersion`

## 🚀 Redéployer

### Étape 1 : Commit le fix
```bash
cd itstock-api

git add prisma/schema.prisma
git commit -m "Fix: Add missing relation targetDevices in AppVersion"
git push origin main
```

### Étape 2 : Railway rebuild automatique
Railway détecte le push et rebuild automatiquement.

Allez sur https://railway.app et vérifiez le statut.

---

## 📝 Changement effectué

Dans `prisma/schema.prisma` :

```prisma
model AppVersion {
  // ... champs existants ...
  
  updateSessions  UpdateSession[]
  targetDevices   Device[]         // ← AJOUTÉ : relation inverse
  
  @@index([channel, isActive])
  @@map("app_versions")
}
```

---

## 🔧 Si ça ne marche toujours pas

Vérifiez les logs Railway :
Dashboard → CRM_SERV → Deployments → Dernier build → Logs

Ou exécutez localement pour tester :
```bash
cd itstock-api
npx prisma generate
```
