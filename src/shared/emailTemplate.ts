import { ICreateAccount, IResetPassword } from '../interfaces/emailTemplate';

const createAccount = (values: ICreateAccount) => {
  const data = {
    to: values.email,
    subject: 'Verify your account',
    html: `<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 50px; padding: 20px; color: #555;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <img src="https://ibb.co.com/qxFPvpn" alt="Logo" style="display: block; margin: 0 auto 20px; width:150px" />
          <h2 style="color: #4D3859; font-size: 24px; margin-bottom: 20px;">Hey! ${values.name},Your salon-go Account Credentials</h2>
        <div style="text-align: center;">
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">Your single use code is:</p>
            <div style="background: #4D3859; width: 120px; padding: 10px; text-align: center; border-radius: 8px; color: #fff; font-size: 25px; letter-spacing: 2px; margin: 20px auto;">${values.otp}</div>
            <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">This code is valid for 3 minutes.</p>
        </div>
    </div>
</body>`,
  };
  return data;
};

const resetPassword = (values: IResetPassword) => {
  const data = {
    to: values.email,
    subject: 'Reset Your Salon Go Password',
    html: `
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
        <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #fff; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); padding: 30px; text-align: center;">
            <!-- Logo -->
            <img src="https://res.cloudinary.com/di2erk78w/image/upload/v1738382189/B694F238-61D7-490D-9F1B-3B88CD6DD094_1_tqeqst.png" alt="Salon Go Logo" style="display: block; margin: 0 auto 20px; width: 150px;" />

            <!-- Heading -->
            <h1 style="color: #4D3859; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>

            <!-- Description about Salon Go -->
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Welcome to <strong>Salon Go</strong>, your one-stop solution for booking salon and spa services with ease. Whether you're looking for a quick haircut, a relaxing massage, or a complete makeover, Salon Go connects you with the best professionals in your area.
            </p>

            <!-- OTP Section -->
            <p style="color: #4D3859; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
              To reset your password, use the following One-Time Password (OTP):
            </p>
            <div style="background: #4D3859; width: 120px; padding: 10px; text-align: center; border-radius: 8px; color: #fff; font-size: 25px; letter-spacing: 2px; margin: 20px auto;">
              ${values.otp}
            </div>
            <p style="color: #555; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              This code is valid for <strong>5 minutes</strong>. Please do not share it with anyone.
            </p>

            <!-- Footer -->
            <p style="color: #777; font-size: 14px; line-height: 1.5; margin-top: 30px;">
              If you did not request this password reset, please ignore this email or contact our support team at <a href="mailto:support@salongo.com" style="color: #4D3859; text-decoration: none;">support@salongo.com</a>.
            </p>
          </div>
        </div>
      </body>
    `,
  };
  return data;
};

export const emailTemplate = {
  createAccount,
  resetPassword,
};
