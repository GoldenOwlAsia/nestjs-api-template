import type { UserRole } from '@/common/enums';

export interface CreateTokenDto {
  id: string;
  userId: string;
  userRole: UserRole;
  accessToken: string;
  refreshToken: string;
}
