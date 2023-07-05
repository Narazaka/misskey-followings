import { useEffect, useMemo } from 'react'

import type { AppStore } from '../../../preload/AppStore'
import { TextInput, List, Stack, Button, Text, CloseButton } from '@mantine/core'
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
      console.log(keys)
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
  }

  const removeKeys = useMemo(
    () => keys.map((key) => () => window.electron.ipcRenderer.send('removeKey', { key: key.key })),
    [keys]
  )

  return (
    <>
      <List>
        {keys.map((key, i) => (
          <List.Item key={key.site}>
            <Text>{key.site}</Text>
            <CloseButton title="delete" onClick={removeKeys[i]} />
          </List.Item>
        ))}
      </List>
      <Stack>
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
      </Stack>
    </>
  )
}

export default ApiKeys
