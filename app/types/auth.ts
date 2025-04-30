export interface LoginForm {
  email: string;
  password: string;
}

export interface AuthError {
  [key: string]: string | undefined;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export type ActionData = {
  errors?: AuthError;
};

