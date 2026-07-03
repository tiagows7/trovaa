export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

export type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Pick<Profile, "username"> | null;
};
