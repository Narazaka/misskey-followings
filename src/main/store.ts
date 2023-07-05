import Store from 'electron-store'
import { AppStore } from '../preload/AppStore'

export const store = new Store<AppStore>({
  schema: {
    keys: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          site: {
            type: 'string' as const
          },
          key: {
            type: 'string' as const
          },
          enabled: {
            type: 'boolean' as const
          }
        },
        required: ['site', 'key']
      }
    }
  }
})
