import { RoleCode } from './role';

export interface CurrentUser {
  id: number;
  accountId: string;
  email: string;
  name: string;
  isActive: boolean;
  roleId: number;
  roleCode: RoleCode;
  positionId: number | null;
  positionName: string | null;
  teamId: number | null;
  managerAccountId: string | null;
}
