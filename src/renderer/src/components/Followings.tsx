import { useEffect, useMemo, useState } from "react";

import type { AppStore } from "../../../preload/AppStore";
import { Button, Box, Group, Grid, TextInput, MultiSelect, Chip, Switch } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FollowingsMap } from "src/preload/FollowingsMap";
import { uniqBy } from "@renderer/util/uniqBy";
import { set } from "@renderer/util/set";
import { useInputState, useLocalStorage } from "@mantine/hooks";
import { uniqSortBy } from "@renderer/util/uniqSortBy";
import { sortBy } from "@renderer/util/sortBy";
import { Following } from "./Following";

export type FollowInfo = {
  id: string;
  name: string;
  username: string;
  url: string | null;
  avatarUrl: string;
  gid: string;
  host: string;
  faviconUrl: string | null;
  source: string;
  type: "following" | "follower";
};

function Followings({ keys }: { keys: AppStore["keys"] }): JSX.Element {
  const [followingsMap, setFollowingsMap] = useState<FollowingsMap>({});
  const allFollowings: FollowInfo[] = useMemo(
    () =>
      sortBy(
        uniqSortBy(
          keys
            .filter((key) => followingsMap[key.key])
            .map((key) => ({ ...followingsMap[key.key], key, source: new URL(key.site).hostname }))
            .flatMap(({ followings, followers, instance, key, source }) =>
              followings
                .map(
                  (following): FollowInfo => ({
                    id: following.id,
                    name: following.followee.name,
                    username: following.followee.username,
                    url: following.followee.url,
                    avatarUrl: following.followee.avatarUrl,
                    gid: `@${following.followee.username}@${
                      following.followee.host || instance?.host || new URL(key.site).hostname
                    }`,
                    host: following.followee.host || instance?.host || new URL(key.site).hostname,
                    faviconUrl: following.followee.instance?.faviconUrl || instance?.faviconUrl,
                    source,
                    type: "following",
                  }),
                )
                .concat(
                  followers.map((follower) => ({
                    id: follower.id,
                    name: follower.follower.name,
                    username: follower.follower.username,
                    url: follower.follower.url,
                    avatarUrl: follower.follower.avatarUrl,
                    gid: `@${follower.follower.username}@${
                      follower.follower.host || instance?.host || new URL(key.site).hostname
                    }`,
                    host: follower.follower.host || instance?.host || new URL(key.site).hostname,
                    faviconUrl: follower.follower.instance?.faviconUrl || instance?.faviconUrl,
                    source,
                    type: "follower",
                  })),
                ),
            ),
          (f) => f.gid,
          (f) => {
            let score = 0;
            if (f.type === "following") score += 1000;
            if (f.host === f.source) score += 100;
            if (f.name) score += 1;
            return -score;
          },
        ),
        (f) => f.username,
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
  const followerExistsMap = useMemo(
    () =>
      keys
        .filter((key) => followingsMap[key.key])
        .reduce((all, key) => {
          const { followers, instance } = followingsMap[key.key];
          const set = new Set<string>();
          for (const follower of followers) {
            const gid = `@${follower.follower.username}@${
              follower.follower.host || instance?.host || new URL(key.site).hostname
            }`;
            set.add(gid);
          }
          return { ...all, [key.key]: set };
        }, {} as Record<string, Set<string>>),
    [followingsMap, keys],
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
        const key = Object.keys(value)[0];
        notifications.hide(`${key}:fetchFollowings`);
        if (error) {
          notifications.show({
            title: `Error on ${keys.find((k) => k.key === key)?.site}`,
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
    for (const key of keys) {
      notifications.show({
        id: `${key.key}:fetchFollowings`,
        title: "Fetching...",
        message: key.site,
        loading: true,
        withCloseButton: false,
        autoClose: false,
      });
    }
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
  const [showFollowings, setShowFollowings] = useState(true);
  const [showFollowers, setShowFollowers] = useState(true);
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
        <Switch
          label="following"
          checked={showFollowings}
          onClick={() => setShowFollowings((prev) => !prev)}
        />
        <Switch
          label="follower"
          checked={showFollowers}
          onClick={() => setShowFollowers((prev) => !prev)}
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
        {allFollowings.map((following) => {
          return (
            <Following
              key={following.id}
              following={following}
              keys={keys}
              followingsMap={followingsMap}
              followingExistsMap={followingExistsMap}
              followerExistsMap={followerExistsMap}
              setFetching={setFetching}
              fetching={fetching}
              displayName={displayName}
              displayUsername={displayUsername}
              displayHost={displayHost}
              show={
                ((showFollowings && following.type === "following") ||
                  (showFollowers && following.type === "follower")) &&
                (!filter || following.gid.includes(filter) || following.name?.includes(filter)) &&
                (!filterHosts.length || filterHosts.includes(following.host))
              }
            />
          );
        })}
      </Grid>
    </Box>
  );
}

export default Followings;
