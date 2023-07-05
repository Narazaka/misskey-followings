import { useEffect, useState } from 'react'

import type { AppStore } from '../../../preload/AppStore'
import { Stack, Button, Box, Avatar, Text } from '@mantine/core'
import { FollowingsMap } from 'src/preload/FollowingsMap'

function Followings({ keys }: { keys: AppStore['keys'] }): JSX.Element {
  const [followingsMap, setFollowingsMap] = useState<FollowingsMap>({})

  useEffect(() => {
    const revoke = window.electron.ipcRenderer.on('followings', (_e, value: FollowingsMap) => {
      setFollowingsMap(value)
    })
    return () => {
      revoke()
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const refresh = () => {
    window.electron.ipcRenderer.send('fetchFollowings')
  }

  return (
    <>
      <Button onClick={refresh}>refresh</Button>
      <Stack>
        {keys
          .filter((key) => followingsMap[key.key])
          .map((key) => (
            <Stack key={key.key}>
              {followingsMap[key.key].map((following) => (
                <Stack key={following.id}>
                  <Box>
                    <Avatar src={following.followee.avatarUrl} />
                    <Text>{following.followee.name}</Text>
                  </Box>
                  <Text>
                    @{following.followee.username}@{following.followee.host}
                  </Text>
                </Stack>
              ))}
            </Stack>
          ))}
      </Stack>
    </>
  )
}

export default Followings
