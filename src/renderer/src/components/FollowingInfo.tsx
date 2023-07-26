import { memo } from "react";
import { Avatar, Text, Group, Image } from "@mantine/core";
import type { FollowInfo } from "./Followings";

export const FollowingInfo = memo(function FollowingInfo({ following }: { following: FollowInfo }) {
  return (
    <>
      <Group noWrap>
        <Avatar radius="xl" src={following.avatarUrl} />
        <Text truncate title={following.name || following.username}>
          {following.name || following.username}
        </Text>
      </Group>
      <a href={following.url || `https://${following.host}/@${following.username}`}>
        <Group noWrap>
          {following.faviconUrl && <Image maw="16px" src={following.faviconUrl} />}
          <Text truncate title={following.gid}>
            {following.gid}
          </Text>
        </Group>
      </a>
    </>
  );
});
