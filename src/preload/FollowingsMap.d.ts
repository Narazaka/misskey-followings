import * as Misskey from "../../misskey/packages/misskey-js/src";
export type FollowingsMap = {
  [key: string]: {
    followings: Misskey.entities.FollowingFolloweePopulated[];
    followers: Misskey.entities.FollowingFollowerPopulated[];
    user: Misskey.entities.User;
    instance: Misskey.entities.Instance;
  };
};
