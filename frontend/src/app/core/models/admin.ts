import { CurrentUser } from './user';

export interface UserListItem extends CurrentUser {
  createdAt: string;
  updatedAt: string;
}

export interface UserCreatePayload {
  accountId: string;
  email: string;
  name: string;
  password: string;
  roleId: number;
  positionId?: number | null;
  teamId?: number | null;
  managerAccountId?: string | null;
  isActive?: boolean;
}

export interface UserUpdatePayload {
  email?: string;
  name?: string;
  roleId?: number;
  positionId?: number | null;
  teamId?: number | null;
  managerAccountId?: string | null;
  isActive?: boolean;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: number;
  name: string;
  parentPositionId: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
