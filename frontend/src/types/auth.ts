export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'PARENT' | 'ADMIN' | 'CHILD';
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt?: number;
};
