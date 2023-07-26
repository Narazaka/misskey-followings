import { memo } from "react";
import { Avatar, Text, Group, Image } from "@mantine/core";
import type { FollowInfo } from "./Followings";

export const FollowingInfo = memo(function FollowingInfo({ following }: { following: FollowInfo }) {
  return (
    <>
      <Group>
        <Avatar radius="xl" src={following.avatarUrl} />
        <Text>{following.name || following.username}</Text>
      </Group>
      <a href={following.url || `https://${following.host}/@${following.username}`}>
        <Group>
          <Image maw="16px" src={following.faviconUrl} />
          <Text>{following.gid}</Text>
        </Group>
      </a>
    </>
  );
});
