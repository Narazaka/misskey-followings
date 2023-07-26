import { memo, useMemo } from "react";
import type { AppStore } from "../../../preload/AppStore";
import { Stack, Button, Avatar, Text, Image, Indicator } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FollowingsMap } from "src/preload/FollowingsMap";
import { set } from "@renderer/util/set";
import { Instance, User } from "misskey/packages/misskey-js/src/entities";
import { IconUser } from "@tabler/icons-react";
import { FollowingInfo } from "./FollowingInfo";
import type { FollowInfo } from "./Followings";

export function Following({
  following,
  keys,
  followingsMap,
  followingExistsMap,
  followerExistsMap,
  setFetching,
  fetching,
  displayName,
  displayUsername,
  displayHost,
  show,
  width,
}: {
  following: FollowInfo;
  keys: AppStore["keys"];
  followingsMap: FollowingsMap;
  followingExistsMap: Record<string, Set<string>>;
  followerExistsMap: Record<string, Set<string>>;
  setFetching;
  fetching: Set<string>;
  displayName: boolean;
  displayUsername: boolean;
  displayHost: boolean;
  show: boolean;
  width?: string;
}) {
  const FollowButton = useMemo(
    () =>
      memo(function FollowButton({
        storeKey,
        isFollowing,
        isFetching,
        instance,
        user,
        followerExistsMap,
      }: {
        storeKey: AppStore["keys"][number];
        isFollowing: boolean;
        isFetching: boolean;
        instance: Instance;
        user: User;
        followerExistsMap: Record<string, Set<string>>;
      }) {
        const followParams = {
          key: storeKey.key,
          username: following.username,
          host: following.host,
        };
        const followId = `@${followParams.username}@${followParams.host}:${followParams.key}`;
        const gid = `@${followParams.username}@${followParams.host}`;
        const onClick = () => {
          setFetching((prev) => set(prev).add(followId));
          window.electron.ipcRenderer.send(isFollowing ? "unfollow" : "follow", followParams);
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
          <Indicator
            label={<IconUser size="12px" />}
            disabled={!followerExistsMap[storeKey.key]?.has(gid)}
            size={24}
            color="red"
          >
            <Button
              color={following.host === host ? "green" : "blue"}
              disabled={
                isFetching || (following.username === user.username && following.host === host)
              }
              loading={isFetching}
              onClick={onClick}
              variant={isFollowing ? "filled" : "light"}
              fullWidth
            >
              <Image maw="16px" src={instance?.faviconUrl} />
              <Avatar size="xs" src={user.avatarUrl} />
              {displayName && <Text>{user.name}</Text>}
              <Text>
                {displayUsername && `@${user.username}`}
                {displayHost && `@${host}`}
              </Text>
            </Button>
          </Indicator>
        );
      }),
    [displayName, displayUsername, displayHost, following],
  );

  return (
    <Stack
      p="xs"
      m="xs"
      spacing="xs"
      sx={{ borderRadius: "10px", border: "1px solid #ccc", width }}
      display={show ? undefined : "none"}
    >
      <FollowingInfo following={following} />
      {keys
        .filter((key) => key.enabled !== false && followingsMap[key.key])
        .map((key) => {
          const isFollowing = followingExistsMap[key.key]?.has(following.gid);
          const followId = `@${following.username}@${following.host}:${key.key}`;
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
              followerExistsMap={followerExistsMap}
            />
          );
        })}
    </Stack>
  );
}
