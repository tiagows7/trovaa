export type ConversationMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  state_code: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
  ended_at?: string | null;
};

export type MatchQueueEntry = {
  user_id: string;
  state_code: string;
  preferred_gender: ProfileGender;
  created_at: string;
};

export type SavedUser = {
  id: string;
  user_id: string;
  saved_user_id: string;
  last_state_code: string | null;
  created_at: string;
};

export type SavedRoom = {
  id: string;
  user_id: string;
  state_code: string;
  created_at: string;
};

export type ConnectionRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type ConnectionRequest = {
  id: string;
  requester_id: string;
  target_id: string;
  state_code: string;
  status: ConnectionRequestStatus;
  conversation_id: string | null;
  created_at: string;
  responded_at: string | null;
};

export type ProfileGender = "masculino" | "feminino" | "outro";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
  birth_date?: string | null;
  gender?: ProfileGender | null;
  is_vip?: boolean;
  vip_until?: string | null;
  is_admin?: boolean;
};

export type Suggestion = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  state_code: string;
  profiles?: Pick<Profile, "username" | "is_vip" | "vip_until"> | null;
};
