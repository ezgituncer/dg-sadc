export type RoleCode =
  | 'ADMIN'
  | 'HR'
  | 'MANAGER'
  | 'TECH_LEAD'
  | 'QA_SPECIALIST'
  | 'WORKER';

export const ROLES_WITHOUT_WORKER: RoleCode[] = [
  'ADMIN',
  'HR',
  'MANAGER',
  'TECH_LEAD',
  'QA_SPECIALIST',
];

export const ROLES_THAT_EDIT_WORKING_DAYS: RoleCode[] = [
  'ADMIN',
  'MANAGER',
  'TECH_LEAD',
  'QA_SPECIALIST',
];
