import 'dotenv/config'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { AUTH_IPC } from '../../shared/auth-types'
import type { AuthMode } from '../../shared/auth-types'
import { clearSession, getSession, httpRequest, startOAuthFlow } from './auth-service'
import { buildGitHubOAuthConfig } from './oauth-config'
import { startTokenRefreshService, stopTokenRefreshService } from './token-refresh-service'

const isDev = !app.isPackaged

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function broadcastSession(session: Awaited<ReturnType<typeof getSession>>): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send(AUTH_IPC.SESSION_CHANGED, session)
  }
}

function registerAuthHandlers(): void {
  const config = buildGitHubOAuthConfig()

  ipcMain.handle(AUTH_IPC.START, async (_event, mode: AuthMode) => {
    const session = await startOAuthFlow(mode, config)
    broadcastSession(session)
    return session
  })

  ipcMain.handle(AUTH_IPC.GET_SESSION, () => getSession())

  ipcMain.handle(AUTH_IPC.LOGOUT, () => {
    clearSession()
    broadcastSession(null)
    return null
  })
}

app.whenReady().then(() => {
  const config = buildGitHubOAuthConfig()
  registerAuthHandlers()
  startTokenRefreshService(config, httpRequest)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  stopTokenRefreshService()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
