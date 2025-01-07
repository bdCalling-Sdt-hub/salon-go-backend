import crypto from 'crypto';

const cryptoToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export default cryptoToken;

export const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};
