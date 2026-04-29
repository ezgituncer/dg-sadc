import { RoleCode } from './role';

export interface CurrentUser {
  id: number;
  accountId: string;
  email: string;
  name: string;
  position: string | null;
  isActive: boolean;
  roleId: number;
  roleCode: RoleCode;
  teamId: number | null;
  managerAccountId: string | null;
}
