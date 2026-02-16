const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

let mainWindow = null;

function setupAutoUpdater(window) {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Check for updates on startup
  autoUpdater.checkForUpdates().catch(err => {
    console.log('[Updater] No update server configured:', err.message);
  });

  // Check every 6 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 6 * 60 * 60 * 1000);

  // Events
  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise a jour disponible',
      message: `Une nouvelle version (${info.version}) est disponible.`,
      detail: 'Voulez-vous la telecharger maintenant ?',
      buttons: ['Telecharger', 'Plus tard'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });

    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] Download progress: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise a jour prete',
      message: `La version ${info.version} a ete telechargee.`,
      detail: 'Redemarrer maintenant pour installer la mise a jour ?',
      buttons: ['Redemarrer', 'Plus tard'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });

    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
  });
}

module.exports = { setupAutoUpdater };
