import { User } from '../../modules/users/users.entity';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Partial<User>;
}
