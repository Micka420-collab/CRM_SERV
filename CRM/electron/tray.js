const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

let tray = null;

function setupTray(mainWindow, iconPath) {
  // Create tray icon
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch (e) {
    // Fallback: no icon if path invalid
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('ITStock CRM');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir ITStock CRM',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Verifier les mises a jour',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('check-for-updates');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click to open
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

module.exports = { setupTray };
