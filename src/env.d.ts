import type { AuthApi } from '../../electron/preload/index'

declare global {
  interface Window {
    authApi: AuthApi
  }
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

export {}
