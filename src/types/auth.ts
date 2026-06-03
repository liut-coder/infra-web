export interface UserProfile {
  id: string;
  username?: string;
  displayName?: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}
