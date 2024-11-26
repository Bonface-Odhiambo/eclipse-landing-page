const nodemailer = require('nodemailer');
const User = require('../models/userModels'); // Make sure this path is correct

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'seclipsewriters@gmail.com', // Eclipse writers email
    pass: process.env.EMAIL_PASS // Use an app-specific password stored in .env
  }
});

exports.sendOrderReassignmentEmail = async (userId, orderId, isNewWriter) => {
  const user = await User.findById(userId);
  const subject = isNewWriter ? 'New Order Assigned' : 'Order Reassigned';
  const content = isNewWriter
    ? `A new order (ID: ${orderId}) has been assigned to you.`
    : `Your order (ID: ${orderId}) has been reassigned to another writer.`;

  const mailOptions = {
    from: 'seclipsewriters@gmail.com',
    to: user.email,
    subject: subject,
    html: `<p>${content} Please check your dashboard for more details.</p>`
  };

  await transporter.sendMail(mailOptions);
};

exports.sendVerificationEmail = async (email, token) => {
  const mailOptions = {
    from: 'seclipsewriters@gmail.com',
    to: email,
    subject: 'Verify Your Email',
    html: `<p>Please click <a href="${process.env.FRONTEND_URL}/verify-email/${token}">here</a> to verify your email.</p>`
  };

  await transporter.sendMail(mailOptions);
};

exports.sendOrderNotification = async (email, orderDetails) => {
  const mailOptions = {
    from: 'seclipsewriters@gmail.com',
    to: email,
    subject: 'New Order Assigned',
    html: `<p>A new order has been assigned to you. Order ID: ${orderDetails.id}</p>`
  };

  await transporter.sendMail(mailOptions);
};

// New function for sending mass emails
exports.sendMassEmail = async (recipients, subject, content) => {
  const mailOptions = {
    from: 'seclipsewriters@gmail.com',
    bcc: recipients, // Use BCC for mass emails to protect recipient privacy
    subject: subject,
    html: content
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Mass email sent successfully');
  } catch (error) {
    console.error('Error sending mass email:', error);
    throw error; // Rethrow the error so it can be handled by the caller
  }
};

module.exports = exports;