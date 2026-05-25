/// <reference types="vite/client" />

import type { AuthApi } from '../../electron/preload/index'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

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
