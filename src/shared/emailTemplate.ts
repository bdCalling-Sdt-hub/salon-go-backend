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

const onboardingNewProfessional = (values: { email: string; role: string; name: string }) => {
  const data = {
    to: values.email,
    subject: `${values.name}, Welcome to Salon Go - Complete your onboarding process`,
    html: `<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 50px; padding: 20px; color: #555;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <!-- Logo -->
        <img src="https://res.cloudinary.com/di2erk78w/image/upload/v1738382189/B694F238-61D7-490D-9F1B-3B88CD6DD094_1_tqeqst.png" alt="Salon Go Logo" style="display: block; margin: 0 auto 20px; width: 150px;" />

        <!-- Welcome message -->
        <h2 style="color: #4D3859; font-size: 24px; margin-bottom: 20px;">Welcome to Salon Go</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
          Thank you for joining Salon Go. We are excited to have you on board.
        </p>

        <!-- Onboarding process -->
        <p style="color: #4D3859; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
          To complete your onboarding process, please follow the steps below:
        </p>
        <ol style="margin-bottom: 20px;">
          <li style="margin-bottom: 10px;">Submit documents</li>
          <li style="margin-bottom: 10px;">Setup your profile in the app</li>
          <li style="margin-bottom: 10px;">Wait for verification from our admin</li>
        </ol>

        <!-- Documents Table -->
        <p style="color: #4D3859; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
          Please ensure to submit the necessary documents as shown in the table below:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="padding: 10px; background-color: #f0f0f0; color: #4D3859; text-align: left; border: 1px solid #ddd;">Document</th>
              <th style="padding: 10px; background-color: #f0f0f0; color: #4D3859; text-align: left; border: 1px solid #ddd;">Necessary</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">NID (National ID) or Passport</td>
              <td style="padding: 10px; border: 1px solid #ddd;">Yes</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Business Registration Certificate</td>
              <td style="padding: 10px; border: 1px solid #ddd;">Yes</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Profile Picture</td>
              <td style="padding: 10px; border: 1px solid #ddd;">Yes</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Proof of Address (Utility Bill/Bank Statement)</td>
              <td style="padding: 10px; border: 1px solid #ddd;">Yes</td>
            </tr>
          </tbody>
        </table>

        <!-- Thank you message -->
        <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
          Thank you for your cooperation. If you have any questions or concerns, please contact our support team at <a href="mailto:support@salongo.com" style="color: #4D3859; text-decoration: none;">support@salongo.com</a>.
        </p>
    </div>
</body>`,
  };
  return data;
};



const welcomeNewVerifiedProfessional = (values: { email: string; name: string }) => {
  const data = {
    to: values.email,
    subject: `${values.name}, welcome to Salon Go - You have been verified`,
    html: `<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0; color: #555;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
        <!-- Logo -->
        <img src="https://res.cloudinary.com/di2erk78w/image/upload/v1738382189/B694F238-61D7-490D-9F1B-3B88CD6DD094_1_tqeqst.png" alt="Salon Go Logo" style="display: block; margin: 0 auto 20px; width: 150px;" />

        <!-- Welcome message -->
        <h2 style="color: #4D3859; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center;">Welcome to Salon Go, ${values.name}!</h2>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 20px;">
          We're thrilled to have you join the Salon Go family. Congratulations on getting verified!
        </p>

        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);">
          <h3 style="color: #4D3859; font-size: 20px; margin-bottom: 15px;">Next Steps:</h3>
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
            Now that you're verified, you can start creating your services and accept appointments.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
            In the coming days, we’ll be launching a subscription option tailored for professionals like you.
          </p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Our admin will get in touch with you once the subscription service is available.
          </p>
        </div>

        <p style="color: #555; font-size: 16px; line-height: 1.6; text-align: center; margin-top: 20px;">
          If you have any questions, feel free to reach out to us at <a href="mailto:support@salongo.com" style="color: #4D3859; text-decoration: none;">support@salongo.com</a>.
        </p>
    </div>
</body>`,
  };
  return data;
};


export const emailTemplate = {
  createAccount,
  resetPassword,
  onboardingNewProfessional,
  welcomeNewVerifiedProfessional
};
