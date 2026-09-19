import { User } from '../../modules/users/users.entity';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Partial<User>;
  restaurant: { id: string; name: string; address: string | null; phone: string | null } | null;
}
