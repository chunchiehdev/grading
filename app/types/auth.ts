export interface LoginForm {
  email: string;
  password: string;
}

export interface AuthError {
  email?: string;
  password?: string;
  general?: string;
}
