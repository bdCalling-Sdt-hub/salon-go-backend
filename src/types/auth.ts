export type IVerifyEmailOrPhone = {
  email?: string;
  contact?: string;
  oneTimeCode: number;
};

export type IPhoneVerify = {
  contact: string;
  oneTimeCode: number;
};
export type ILoginData = {
  email: string;
  password: string;
  deviceId?: string;
};

export type IAuthResetPassword = {
  newPassword: string;
  confirmPassword: string;
};

export type IChangePassword = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
