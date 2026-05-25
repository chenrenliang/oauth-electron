import { contextBridge, ipcRenderer } from 'electron'
import { AUTH_IPC } from '../../shared/auth-types'
import type { AuthMode, AuthSession } from '../../shared/auth-types'

export type AuthApi = {
  startAuth: (mode: AuthMode) => Promise<AuthSession>
  getSession: () => Promise<AuthSession | null>
  logout: () => Promise<null>
  onSessionChanged: (callback: (session: AuthSession | null) => void) => () => void
  onTokenRefreshed: (callback: (session: AuthSession) => void) => () => void
}

const authApi: AuthApi = {
  startAuth: (mode) => ipcRenderer.invoke(AUTH_IPC.START, mode),
  getSession: () => ipcRenderer.invoke(AUTH_IPC.GET_SESSION),
  logout: () => ipcRenderer.invoke(AUTH_IPC.LOGOUT),
  onSessionChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, session: AuthSession | null) => {
      callback(session)
    }
    ipcRenderer.on(AUTH_IPC.SESSION_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(AUTH_IPC.SESSION_CHANGED, listener)
    }
  },
  onTokenRefreshed: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, session: AuthSession) => {
      callback(session)
    }
    ipcRenderer.on(AUTH_IPC.TOKEN_REFRESHED, listener)
    return () => {
      ipcRenderer.removeListener(AUTH_IPC.TOKEN_REFRESHED, listener)
    }
  }
}

contextBridge.exposeInMainWorld('authApi', authApi)
