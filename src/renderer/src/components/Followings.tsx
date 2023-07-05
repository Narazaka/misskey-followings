import { memo, useEffect, useMemo, useState } from "react";

import type { AppStore } from "../../../preload/AppStore";
import {
  Stack,
  Button,
  Box,
  Avatar,
  Text,
  Group,
  Image,
  Grid,
  TextInput,
  MultiSelect,
  Chip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FollowingsMap } from "src/preload/FollowingsMap";
import { uniqBy } from "@renderer/util/uniqBy";
import { set } from "@renderer/util/set";
import { useInputState, useLocalStorage } from "@mantine/hooks";
import { Instance, User } from "misskey/packages/misskey-js/src/entities";
import { uniqSortBy } from "@renderer/util/uniqSortBy";
import { sortBy } from "@renderer/util/sortBy";

function Followings({ keys }: { keys: AppStore["keys"] }): JSX.Element {
  const [followingsMap, setFollowingsMap] = useState<FollowingsMap>({});
  const allFollowings = useMemo(
    () =>
      sortBy(
        uniqSortBy(
          keys
            .filter((key) => followingsMap[key.key])
            .map((key) => ({ ...followingsMap[key.key], key, source: new URL(key.site).hostname }))
            .flatMap(({ followings, instance, key, source }) =>
              followings.map((following) => ({
                ...following,
                gid: `@${following.followee.username}@${
                  following.followee.host || instance?.host || new URL(key.site).hostname
                }`,
                host: following.followee.host || instance?.host || new URL(key.site).hostname,
                faviconUrl: following.followee.instance?.faviconUrl || instance?.faviconUrl,
                source,
              })),
            ),
          (f) => f.gid,
          (f) => {
            if (f.host === f.source) return 0;
            if (f.followee.name) return 1;
            return 2;
          },
        ),
        (f) => f.followee.username,
      ),
    [followingsMap, keys],
  );
  const hosts = useMemo(
    () =>
      uniqBy(
        allFollowings.map((f) => f.host),
        (host) => host,
      ),
    [allFollowings],
  );
  const [followingExistsMap, setFollowingExistsMap] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    setFollowingExistsMap(
      keys
        .filter((key) => followingsMap[key.key])
        .reduce((all, key) => {
          const { followings, instance } = followingsMap[key.key];
          const set = new Set<string>();
          for (const following of followings) {
            const gid = `@${following.followee.username}@${
              following.followee.host || instance?.host || new URL(key.site).hostname
            }`;
            set.add(gid);
          }
          return { ...all, [key.key]: set };
        }, {} as Record<string, Set<string>>),
    );
  }, [followingsMap, keys]);

  useEffect(() => {
    const revoke = window.electron.ipcRenderer.on(
      "followings",
      (_e, value: FollowingsMap, error: string) => {
        setFollowingsMap((prev) => ({ ...prev, ...value }));
        if (error) {
          notifications.show({
            title: `Error`,
            message: error,
            withCloseButton: true,
            color: "red",
          });
        }
      },
    );
    return () => {
      revoke();
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const refresh = () => {
    window.electron.ipcRenderer.send("fetchFollowings");
  };

  const [fetching, setFetching] = useState(() => new Set<string>());

  useEffect(() => {
    const genCb =
      (op: "add" | "delete") =>
      (
        _e: unknown,
        followParams: { username: string; host: string; key: string },
        errored?: boolean,
      ) => {
        const followId = `@${followParams.username}@${followParams.host}:${followParams.key}`;
        const gid = `@${followParams.username}@${followParams.host}`;
        const type = op === "add" ? "Follow" : "Unfollow";
        setFetching((prev) => set(prev).delete(followId));
        notifications.hide(`${followId}:loading`);
        if (errored) {
          notifications.show({
            title: `${type} Error`,
            message: (
              <>
                {gid}
                <br />
                {errored}
              </>
            ),
            withCloseButton: true,
            color: "red",
          });
        } else {
          notifications.show({
            title: `${type} Success`,
            message: gid,
            withCloseButton: true,
          });
          setFollowingExistsMap((prev) => {
            const current = { ...prev };
            if (!current[followParams.key]) {
              current[followParams.key] = new Set();
            }
            const newSet = set(current[followParams.key])[op](gid);
            current[followParams.key] = newSet;
            return current;
          });
        }
      };
    const revokeFollowed = window.electron.ipcRenderer.on("followed", genCb("add"));
    const revokeUnfollowed = window.electron.ipcRenderer.on("unfollowed", genCb("delete"));
    return () => {
      revokeFollowed();
      revokeUnfollowed();
    };
  }, []);

  const [filter, setFilter] = useInputState("");
  const [filterHosts, setFilterHosts] = useState<string[]>([]);
  const [displayName, setDisplayName] = useLocalStorage({
    key: "displayName",
    defaultValue: true,
  });
  const [displayUsername, setDisplayUsername] = useLocalStorage({
    key: "displayUsername",
    defaultValue: true,
  });
  const [displayHost, setDisplayHost] = useLocalStorage({
    key: "displayHost",
    defaultValue: true,
  });

  return (
    <Box my="xs">
      <Group>
        <Button onClick={refresh}>refresh</Button>
        <TextInput
          type="search"
          placeholder="search"
          value={filter}
          onInput={setFilter}
          onChange={setFilter}
        />
        <MultiSelect
          data={hosts}
          value={filterHosts}
          onChange={setFilterHosts}
          placeholder="filter by host"
          searchable
          clearable
        />
        <Chip checked={displayName} onClick={() => setDisplayName((prev) => !prev)}>
          name
        </Chip>
        <Chip checked={displayUsername} onClick={() => setDisplayUsername((prev) => !prev)}>
          username
        </Chip>
        <Chip checked={displayHost} onClick={() => setDisplayHost((prev) => !prev)}>
          host
        </Chip>
      </Group>
      <Grid my="xs">
        {allFollowings
          .filter(
            (following) =>
              (!filter ||
                following.gid.includes(filter) ||
                following.followee.name?.includes(filter)) &&
              (!filterHosts.length || filterHosts.includes(following.host)),
          )
          .map((following) => {
            return (
              <Following
                key={following.id}
                following={following}
                keys={keys}
                followingsMap={followingsMap}
                followingExistsMap={followingExistsMap}
                setFetching={setFetching}
                fetching={fetching}
                displayName={displayName}
                displayUsername={displayUsername}
                displayHost={displayHost}
              />
            );
          })}
      </Grid>
    </Box>
  );
}

export default Followings;

function Following({
  following,
  keys,
  followingsMap,
  followingExistsMap,
  setFetching,
  fetching,
  displayName,
  displayUsername,
  displayHost,
}: {
  following: import("misskey-js").entities.FollowingFolloweePopulated & {
    gid: string;
    host: string;
    faviconUrl: string | null;
  };
  keys: AppStore["keys"];
  followingsMap: FollowingsMap;
  followingExistsMap: Record<string, Set<string>>;
  setFetching;
  fetching: Set<string>;
  displayName: boolean;
  displayUsername: boolean;
  displayHost: boolean;
}) {
  const FollowButton = useMemo(
    () =>
      memo(function FollowButton({
        storeKey,
        isFollowing,
        isFetching,
        instance,
        user,
      }: {
        storeKey: AppStore["keys"][number];
        isFollowing: boolean;
        isFetching: boolean;
        instance: Instance;
        user: User;
      }) {
        const followParams = {
          key: storeKey.key,
          username: following.followee.username,
          host: following.host,
        };
        const followId = `@${followParams.username}@${followParams.host}:${followParams.key}`;
        const onClick = () => {
          setFetching((prev) => set(prev).add(followId));
          window.electron.ipcRenderer.send(isFollowing ? "unfollow" : "follow", followParams);
          const gid = `@${followParams.username}@${followParams.host}`;
          notifications.show({
            id: `${followId}:loading`,
            title: isFollowing ? "Unfollow" : "Follow",
            message: gid,
            withCloseButton: true,
            loading: true,
          });
        };
        const host = instance?.host || new URL(storeKey.site).hostname;
        return (
          <Button
            color={following.host === host ? "green" : "blue"}
            disabled={
              isFetching ||
              (following.followee.username === user.username && following.host === host)
            }
            loading={isFetching}
            onClick={onClick}
            variant={isFollowing ? "filled" : "light"}
          >
            <Image maw="16px" src={instance?.faviconUrl} />
            <Avatar size="xs" src={user.avatarUrl} />
            {displayName && <Text>{user.name}</Text>}
            <Text>
              {displayUsername && `@${user.username}`}
              {displayHost && `@${host}`}
            </Text>
          </Button>
        );
      }),
    [displayName, displayUsername, displayHost, following],
  );

  return (
    <Stack p="xs" m="xs" sx={{ borderRadius: "10px", border: "1px solid #ccc" }}>
      <FollowingInfo following={following} />
      {keys
        .filter((key) => key.enabled !== false && followingsMap[key.key])
        .map((key) => {
          const isFollowing = followingExistsMap[key.key]?.has(following.gid);
          const followId = `@${following.followee.username}@${following.host}:${key.key}`;
          const isFetching = fetching.has(followId);
          const { user, instance } = followingsMap[key.key];
          return (
            <FollowButton
              key={key.key}
              storeKey={key}
              isFollowing={isFollowing}
              isFetching={isFetching}
              instance={instance}
              user={user}
            />
          );
        })}
    </Stack>
  );
}

const FollowingInfo = memo(function FollowingInfo({
  following,
}: {
  following: import("misskey-js").entities.FollowingFolloweePopulated & {
    gid: string;
    host: string;
    faviconUrl: string | null;
  };
}) {
  return (
    <>
      <Group>
        <Avatar radius="xl" src={following.followee.avatarUrl} />
        <Text>{following.followee.name || following.followee.username}</Text>
      </Group>
      <a
        href={following.followee.url || `https://${following.host}/@${following.followee.username}`}
      >
        <Group>
          <Image maw="16px" src={following.faviconUrl} />
          <Text>{following.gid}</Text>
        </Group>
      </a>
    </>
  );
});
