import { RoleCode } from './role';

export interface CurrentUser {
  id: number;
  accountId: string;
  email: string;
  name: string;
  isActive: boolean;
  roleId: number;
  roleCode: RoleCode;
  /** Superuser (ADMIN) — bypasses all permission checks. */
  isSuperuser: boolean;
  /** Effective permission codes (e.g. "yearly_report.view"). */
  permissions: string[];
  positionId: number | null;
  positionName: string | null;
  teamId: number | null;
  managerAccountId: string | null;
}
