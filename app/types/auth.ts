export interface LoginForm {
  email: string;
  password: string;
}

export interface AuthError {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export type ActionData = {
  errors?: AuthError;
};

