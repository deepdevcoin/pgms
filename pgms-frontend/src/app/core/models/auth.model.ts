export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  TENANT = 'TENANT'
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  userId: number;
  name: string;
  isFirstLogin: boolean;
}

export interface ChangePasswordRequest {
  userId: number;
  newPassword: string;
}

export interface AuthSession {
  token: string;
  userId: number;
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
}
