import { useEffect, useMemo } from 'react'

import type { AppStore } from '../../../preload/AppStore'
import { TextInput, Button, Text, CloseButton, Group, Badge } from '@mantine/core'
import { useInputState } from '@mantine/hooks'

function ApiKeys({
  keys,
  setKeys
}: {
  keys: AppStore['keys']
  setKeys: React.Dispatch<React.SetStateAction<AppStore['keys']>>
}): JSX.Element {
  useEffect(() => {
    window.electron.ipcRenderer.send('getKeys')
    const revoke = window.electron.ipcRenderer.on('keys', (_e, keys: AppStore['keys']) => {
      setKeys(keys)
    })
    return () => {
      revoke()
    }
  }, [])

  const [site, setSite] = useInputState('')
  const [key, setKey] = useInputState('')

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const onSubmit = () => {
    window.electron.ipcRenderer.send('addKey', { key, site })
    setSite('')
    setKey('')
  }

  const removeKeys = useMemo(
    () => keys.map((key) => () => window.electron.ipcRenderer.send('removeKey', { key: key.key })),
    [keys]
  )

  const toggleKeys = useMemo(
    () =>
      keys.map(
        (key) => () =>
          window.electron.ipcRenderer.send(key.enabled === false ? 'enableKey' : 'disableKey', {
            key: key.key
          })
      ),
    [keys]
  )

  return (
    <>
      {keys.map((key, i) => (
        <Badge key={key.site}>
          <Group spacing={2}>
            <Text>{key.site}</Text>
            <Button
              compact
              color={key.enabled === false ? 'gray' : undefined}
              onClick={toggleKeys[i]}
            >
              {key.enabled === false ? '無効' : '有効'}
            </Button>
            <CloseButton title="delete" onClick={removeKeys[i]} />
          </Group>
        </Badge>
      ))}
      <Group>
        <TextInput
          label="site"
          placeholder="https://misskey.io"
          withAsterisk
          required
          value={site}
          onChange={setSite}
        />
        <TextInput
          label="key"
          placeholder="A1bC2dE3fG"
          withAsterisk
          required
          value={key}
          onChange={setKey}
        />
        <Button type="button" onClick={onSubmit} disabled={!key || !site}>
          Add
        </Button>
      </Group>
    </>
  )
}

export default ApiKeys
