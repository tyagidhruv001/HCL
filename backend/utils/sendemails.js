import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const cleanPass = (process.env.EMAIL_PASS || '').replace(/['"]/g, '').replace(/\s+/g, '');
  const cleanUser = (process.env.EMAIL || '').replace(/['"]/g, '').trim();

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: cleanUser,
      pass: cleanPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const mailOptions = {
    from: cleanUser,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  console.log(`[Email Service] Attempting to send email to ${options.email}...`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent successfully to ${options.email}:`, info.messageId);
    return info;
  } catch (err) {
    console.error(`[Email Service] Error sending email:`, err.message || err);
    throw err;
  }
};

export default sendEmail;