export interface LoginFormValues {
  tenantCode: string;
  userId: string;
  password: string;
}

export type LoginFormField = keyof LoginFormValues;
