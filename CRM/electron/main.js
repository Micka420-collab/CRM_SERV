const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { setupTray } = require('./tray');
const { setupAutoUpdater } = require('./updater');

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let splashWindow = null;
let tray = null;
let serverReady = false;

// Determine paths based on dev or production
// Improved detection for manual distribution: if app.asar exists in resources, it's production
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || 
              (!app.isPackaged && !fs.existsSync(path.join(process.resourcesPath, 'app.asar')));
const SERVER_PORT = process.env.PORT || 3000;

function getIconPath() {
  const iconName = process.platform === 'win32' ? 'Favicon.png' : 'Favicon.png';
  if (isDev) {
    return path.join(__dirname, '..', 'LOGO', iconName);
  }
  return path.join(process.resourcesPath, 'LOGO', iconName);
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function updateSplashStatus(message) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('status-update', message);
  }
}

async function startServer() {
  updateSplashStatus('Initialisation du serveur...');
  
  // Set environment for production
  if (!isDev) {
    process.env.NODE_ENV = 'production';
    const dotenvPath = path.join(path.dirname(app.getPath('exe')), '.env');
    if (require('fs').existsSync(dotenvPath)) {
      require('dotenv').config({ path: dotenvPath });
    }
  } else {
    process.env.NODE_ENV = 'development';
    require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
  }

  process.env.PORT = SERVER_PORT;
  process.env.ELECTRON_USER_DATA_PATH = app.getPath('userData');

  try {
    updateSplashStatus('Vérification de la licence...');
    
    const serverPath = isDev
      ? path.join(__dirname, '..', 'server', 'index.js')
      : path.join(__dirname, '..', 'server', 'index.js');
    
    console.log(`[Electron] Loading server from: ${serverPath}`);
    require(serverPath);
    
    serverReady = true;
    console.log(`[Electron] Server started on port ${SERVER_PORT}`);
  } catch (err) {
    console.error('[Electron] Failed to start server:', err);
    updateSplashStatus('Erreur Critique !');
    dialog.showErrorBox(
      'Erreur de demarrage',
      `Impossible de demarrer le serveur ITStock.\n\n${err.message}\n\nStack: ${err.stack}`
    );
    app.quit();
  }
}

function createWindow() {
  const iconPath = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: iconPath,
    title: 'ITStock CRM',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    frame: true,
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#0f172a'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    updateSplashStatus('Lancement...');
    setTimeout(() => {
      if (splashWindow) splashWindow.close();
      mainWindow.show();
    }, 500);
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.on('ready', async () => {
  // Show splash immediately
  createSplashWindow();

  // Start the Express server
  await startServer();

  // Wait for the server to be listenable (retry loop)
  let retries = 0;
  const maxRetries = 20;
  const checkServer = async () => {
    try {
      const response = await fetch(`http://localhost:${SERVER_PORT}/api/license/status`);
      // Even if response is not ok (e.g., 402 License required), the server is up
      // We should open the window so the user can see the activation screen
      updateSplashStatus('Serveur prêt.');
      createWindow();
    } catch (e) {
      if (retries < maxRetries) {
        retries++;
        setTimeout(checkServer, 500);
      } else {
        updateSplashStatus('Serveur hors-ligne.');
        dialog.showErrorBox('Erreur Serveur', 'Le serveur interne ne répond pas.');
        app.quit();
      }
    }
  };

  setTimeout(checkServer, 1000);

  // Send logo path to splash
  if (splashWindow) {
    splashWindow.webContents.on('did-finish-load', () => {
      splashWindow.webContents.send('logo-path', getIconPath());
    });
  }

  // Setup system tray
  tray = setupTray(mainWindow, getIconPath());

  // Setup auto-updater (production only)
  if (!isDev) {
    setupAutoUpdater(mainWindow);
  }
});

// Handle second instance (focus existing window)
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on macOS (tray mode)
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Clean quit
app.on('before-quit', () => {
  app.isQuitting = true;
  if (tray) tray.destroy();
});
