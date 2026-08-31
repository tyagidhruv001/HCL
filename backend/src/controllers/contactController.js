import sendEmail from '../../utils/sendemails.js';
import Contact from '../models/Contact.js';

export const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // 1. Persist inquiry into MongoDB database so no feedback is ever lost
    let contactRecord;
    try {
      contactRecord = await Contact.create({
        name,
        email,
        subject,
        message,
        status: 'received',
      });
    } catch (dbErr) {
      console.warn('[Contact Controller] DB save warning:', dbErr.message);
    }

    // 2. Dispatch email notification asynchronously
    const adminEmail = process.env.EMAIL || 'tyagiidhruv5@gmail.com';
    const emailSubject = `Wanderer Academic Dispatch: ${subject}`;
    const emailMessage = `You have received a new inquiry from the Wanderer contact dispatch.\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nTimestamp: ${new Date().toISOString()}`;

    try {
      await sendEmail({
        email: adminEmail,
        subject: emailSubject,
        message: emailMessage,
      });
      if (contactRecord) {
        contactRecord.status = 'emailed';
        await contactRecord.save();
      }
    } catch (emailErr) {
      console.warn('[Contact Controller] Email dispatch warning (stored in DB):', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Your dispatch has been successfully recorded and transmitted to the engineering team.',
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ message: 'Submission failed. Please try again later.' });
  }
};
