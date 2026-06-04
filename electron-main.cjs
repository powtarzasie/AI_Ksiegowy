const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Register IPC handlers to let the user select a custom DB file path on disk
ipcMain.handle('select-db-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Wybierz lokalizację nowej bazy danych',
    defaultPath: path.join(app.getPath('home'), '.symulator_podatkow', 'baza_danych.json'),
    filters: [
      { name: 'Pliki JSON (*.json)', extensions: ['json'] }
    ],
    properties: ['showOverwriteConfirmation', 'createDirectory']
  });
  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('browse-db-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Wybierz istniejący plik bazy danych',
    defaultPath: app.getPath('home'),
    filters: [
      { name: 'Pliki JSON (*.json)', extensions: ['json'] }
    ],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Automatically launch Express server inside Electron
function startExpressServer() {
  console.log('Main process spawning local tax adviser express server...');
  
  // In packaged mode, we run node dist/server.cjs
  // In development mode, we run tsx server.ts
  const isProduction = app.isPackaged;
  const serverPath = isProduction 
    ? path.join(__dirname, 'dist', 'server.cjs')
    : path.join(__dirname, 'server.ts');

  if (isProduction) {
    serverProcess = spawn('node', [serverPath], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'production' }
    });
  } else {
    // Development using tsx
    serverProcess = spawn('npx', ['tsx', serverPath], {
      shell: true,
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'development' }
    });
  }

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Express stdout]: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Express stderr]: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Express server process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Symulator Podatków CIT i VAT - Desktop",
    icon: path.join(__dirname, 'public', 'favicon.ico'), // Fallback if icon loaded
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Simplest way to bind to window.electron in standard builds
    }
  });

  // Since we run local Express on port 3000, we ALWAYS load http://localhost:3000
  // even in production, because our Express server serves the static React build there!
  // This guarantees that API endpoints and web app remain 100% synchronized!
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000')
      .catch((err) => {
        console.log('Local express server is booting up, retrying connection...');
        setTimeout(() => {
          mainWindow.loadURL('http://localhost:3000').catch(e => {
            console.error('Failed to link to Express on Port 3000:', e);
          });
        }, 1500);
      });
  }, 1000);

  // Customize Desktop Menu Bar
  const template = [
    {
      label: 'Plik',
      submenu: [
        { label: 'Odśwież', role: 'reload' },
        { label: 'Zmień Widok (Pełny ekran)', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Zamknij program', role: 'quit' }
      ]
    },
    {
      label: 'Wygląd',
      submenu: [
        { label: 'Zwiększ czcionkę', role: 'zoomIn' },
        { label: 'Zmniejsz czcionkę', role: 'zoomOut' },
        { label: 'Przełącz Narzędzia Programisty (F12)', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'O programie',
      submenu: [
        {
          label: 'Symulator Podatkowy v2.0 - Desktop',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: 'Informacje',
              message: 'Symulator Podatków CIT i VAT dla Architektów (71.11.Z)',
              detail: 'Wielofunkcyjna wersja desktopowa zintegrowana z lokalnym zapisem plików fizycznych i selektywnym wsparciem dla systemów AI (Gemini, OpenAI, Anthropic, Ollama, LM Studio).'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Start local Express and Electron App
app.on('ready', () => {
  startExpressServer();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
