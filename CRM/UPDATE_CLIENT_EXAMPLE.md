# Guide d'intégration du système de mise à jour

Ce guide explique comment intégrer le système de mise à jour dans votre application CRM (.exe).

## Vue d'ensemble

Le système de mise à jour permet:
- Vérifier automatiquement les mises à jour au démarrage
- Télécharger et installer les mises à jour
- Forcer les mises à jour depuis le dashboard admin
- Déploiement progressif ou immédiat

## Flux de mise à jour

```
1. Démarrage de l'application
2. Vérification de la licence
3. Enregistrement du device (si premier lancement)
4. Vérification des mises à jour (check-update)
5. Si mise à jour disponible:
   - Téléchargement
   - Vérification du checksum
   - Installation
   - Redémarrage
```

## API Endpoints

### 1. Enregistrer le device (premier lancement)

```http
POST /api/v1/updates/register-device
Authorization: Bearer <token>
Content-Type: application/json

{
  "hardwareId": "unique-hardware-id",
  "machineName": "PC-User-01",
  "osVersion": "Windows 10 22H2",
  "appVersion": "1.0.0"
}
```

### 2. Vérifier les mises à jour

```http
GET /api/v1/updates/check?hardwareId=<id>&version=1.0.0&osVersion=Windows%2010
Authorization: Bearer <token>
```

Réponse si mise à jour disponible:
```json
{
  "updateAvailable": true,
  "mandatory": true,
  "version": "1.1.0",
  "downloadUrl": "https://.../ITStock-CRM-1.1.0.exe",
  "checksum": "sha256-hash",
  "size": 85632000,
  "releaseNotes": "Nouvelles fonctionnalités...",
  "sessionId": "session-id-for-tracking"
}
```

### 3. Mettre à jour le statut

```http
POST /api/v1/updates/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "session-id",
  "status": "DOWNLOADING",
  "downloadPercent": 50
}
```

Statuses possibles:
- `DOWNLOADING` - Téléchargement en cours
- `DOWNLOADED` - Téléchargement terminé
- `INSTALLING` - Installation en cours
- `COMPLETED` - Mise à jour réussie
- `FAILED` - Échec de la mise à jour

## Exemple d'implémentation (Node.js/Electron)

```javascript
const { app, dialog, ipcMain } = require('electron');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class UpdateManager {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.hardwareId = this.getHardwareId();
  }

  // Générer un ID unique pour le hardware
  getHardwareId() {
    const os = require('os');
    const data = os.platform() + os.arch() + os.hostname();
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  // Enregistrer le device au premier lancement
  async registerDevice(appVersion) {
    try {
      const os = require('os');
      await axios.post(`${this.apiUrl}/api/v1/updates/register-device`, {
        hardwareId: this.hardwareId,
        machineName: os.hostname(),
        osVersion: os.release(),
        appVersion: appVersion
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
    } catch (err) {
      console.error('Failed to register device:', err.message);
    }
  }

  // Vérifier les mises à jour
  async checkForUpdate(currentVersion) {
    try {
      const os = require('os');
      const response = await axios.get(
        `${this.apiUrl}/api/v1/updates/check`,
        {
          params: {
            hardwareId: this.hardwareId,
            version: currentVersion,
            osVersion: `Windows ${os.release()}`
          },
          headers: { Authorization: `Bearer ${this.token}` }
        }
      );

      return response.data;
    } catch (err) {
      console.error('Update check failed:', err.message);
      return { updateAvailable: false };
    }
  }

  // Télécharger la mise à jour
  async downloadUpdate(updateInfo, onProgress) {
    const { downloadUrl, checksum, size, sessionId } = updateInfo;
    const tempPath = path.join(app.getPath('temp'), 'ITStock-CRM-Update.exe');

    try {
      // Notifier le début du téléchargement
      await this.updateSessionStatus(sessionId, 'DOWNLOADING', { downloadPercent: 0 });

      // Télécharger le fichier
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        headers: { Authorization: `Bearer ${this.token}` }
      });

      const writer = fs.createWriteStream(tempPath);
      let downloaded = 0;

      response.data.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = Math.round((downloaded / size) * 100);
        onProgress(percent);
        
        // Mettre à jour le statut toutes les 10%
        if (percent % 10 === 0) {
          this.updateSessionStatus(sessionId, 'DOWNLOADING', { downloadPercent: percent });
        }
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Vérifier le checksum
      const fileHash = await this.calculateChecksum(tempPath);
      if (fileHash !== checksum) {
        throw new Error('Checksum mismatch - download corrupted');
      }

      await this.updateSessionStatus(sessionId, 'DOWNLOADED');

      return tempPath;
    } catch (err) {
      await this.updateSessionStatus(sessionId, 'FAILED', { errorMessage: err.message });
      throw err;
    }
  }

  // Calculer le checksum SHA256
  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  // Mettre à jour le statut de session
  async updateSessionStatus(sessionId, status, data = {}) {
    try {
      await axios.post(`${this.apiUrl}/api/v1/updates/status`, {
        sessionId,
        status,
        ...data
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
    } catch (err) {
      console.error('Failed to update session status:', err.message);
    }
  }

  // Installer la mise à jour
  async installUpdate(updateFile, sessionId, fromVersion) {
    try {
      await this.updateSessionStatus(sessionId, 'INSTALLING');

      // Sur Windows, lancer l'installateur et quitter
      if (process.platform === 'win32') {
        const { spawn } = require('child_process');
        
        // Lancer l'installateur en mode silencieux
        const installer = spawn(updateFile, ['/SILENT'], {
          detached: true,
          stdio: 'ignore'
        });

        installer.unref();

        // Notifier la réussite
        await this.updateSessionStatus(sessionId, 'COMPLETED', {
          fromVersion,
          duration: 0 // Calculer si besoin
        });

        // Quitter l'application pour permettre l'installation
        app.quit();
      }
    } catch (err) {
      await this.updateSessionStatus(sessionId, 'FAILED', { errorMessage: err.message });
      throw err;
    }
  }

  // Flux complet de mise à jour
  async performUpdate(currentVersion) {
    try {
      // 1. Vérifier si mise à jour disponible
      const updateInfo = await this.checkForUpdate(currentVersion);
      
      if (!updateInfo.updateAvailable) {
        console.log('No update available');
        return;
      }

      console.log(`Update available: ${updateInfo.version}`);

      // 2. Si obligatoire, ne pas donner le choix
      if (updateInfo.mandatory) {
        const result = await dialog.showMessageBox({
          type: 'info',
          title: 'Mise à jour obligatoire',
          message: `Une mise à jour obligatoire (${updateInfo.version}) est disponible.`,
          detail: updateInfo.releaseNotes,
          buttons: ['Mettre à jour maintenant', 'Quitter'],
          defaultId: 0,
          cancelId: 1
        });

        if (result.response === 1) {
          app.quit();
          return;
        }
      } else {
        // Mise à jour optionnelle
        const result = await dialog.showMessageBox({
          type: 'question',
          title: 'Mise à jour disponible',
          message: `La version ${updateInfo.version} est disponible.`,
          detail: updateInfo.releaseNotes,
          buttons: ['Mettre à jour', 'Plus tard'],
          defaultId: 0
        });

        if (result.response === 1) return;
      }

      // 3. Télécharger
      const updateFile = await this.downloadUpdate(updateInfo, (percent) => {
        console.log(`Download progress: ${percent}%`);
        // Mettre à jour une barre de progression si UI disponible
      });

      // 4. Installer
      await this.installUpdate(updateFile, updateInfo.sessionId, currentVersion);

    } catch (err) {
      console.error('Update failed:', err);
      dialog.showErrorBox('Erreur de mise à jour', err.message);
    }
  }
}

// Utilisation dans main.js
const updateManager = new UpdateManager(
  'http://localhost:4000',
  'votre-token-jwt'
);

// Au démarrage
app.whenReady().then(async () => {
  const currentVersion = app.getVersion();
  
  // Enregistrer le device
  await updateManager.registerDevice(currentVersion);
  
  // Vérifier les mises à jour
  await updateManager.performUpdate(currentVersion);
});
```

## Dashboard Admin

Dans le dashboard web, vous pouvez:

1. **Uploader une nouvelle version**
   - Aller dans `/admin/versions`
   - Upload le fichier .exe
   - Définir: version, notes de release, obligatoire ou non

2. **Forcer les mises à jour**
   - Sélectionner une version
   - Cliquer "Forcer la mise à jour"
   - Choisir: tous les devices ou sélection
   - Option: déploiement progressif (ex: 10% → 50% → 100%)

3. **Voir les statistiques**
   - Nombre de devices à jour
   - Progression des mises à jour
   - Échecs et erreurs

## Webhook (optionnel)

Pour notifier les utilisateurs en temps réel:

```javascript
// Dans votre serveur, envoyer des notifications WebSocket
io.on('connection', (socket) => {
  socket.on('register-device', (hardwareId) => {
    socket.join(`device:${hardwareId}`);
  });
});

// Quand une mise à jour est forcée
io.to(`device:${hardwareId}`).emit('force-update', {
  version: '1.1.0',
  downloadUrl: 'https://...',
  mandatory: true
});
```

## Sécurité

1. **Vérification du checksum**: Toujours vérifier SHA256 après téléchargement
2. **HTTPS uniquement**: Les URLs de téléchargement doivent être en HTTPS
3. **Authentification**: Toutes les requêtes nécessitent un token JWT valide
4. **Rate limiting**: Protection contre les abus de l'API

## Notes

- Les mises à jour peuvent être **silencieuses** (auto) ou **interactives** (avec dialog)
- Utiliser **Squirrel** ou **electron-updater** pour une gestion avancée des mises à jour
- Tester les mises à jour dans un environnement de staging avant production
