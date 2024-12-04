const generateOTP = () => {
  return Math.floor(Math.random() * (9999 - 1000 + 1) + 10000);
};

export default generateOTP;
