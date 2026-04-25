/**
 * Email Service
 * Handles email notifications using Nodemailer
 *
 * REST PRINCIPLES APPLIED:
 * - Async notifications: Email sent after resource state changes
 * - Stateless: Email templates don't store session data
 * - Proper error handling: Email failures don't break main operations
 */
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email templates
const emailTemplates = {
  welcome: (user) => ({
    subject: 'Welcome to Smart Event Booking!',
    html: `
      <h1>Welcome, ${user.firstName}!</h1>
      <p>Thank you for registering with Smart Event Booking System.</p>
      <p>Your account has been created with email: ${user.email}</p>
      <p>You can now browse events, book tickets, and leave reviews.</p>
    `
  }),

  bookingConfirmation: (booking) => ({
    subject: `Booking Confirmed - ${booking.ticketCode}`,
    html: `
      <h1>Booking Confirmed!</h1>
      <p>Your booking has been confirmed.</p>
      <h2>Booking Details:</h2>
      <ul>
        <li><strong>Ticket Code:</strong> ${booking.ticketCode}</li>
        <li><strong>Event:</strong> ${booking.event?.title || 'Event'}</li>
        <li><strong>Tickets:</strong> ${booking.ticketsCount}</li>
        <li><strong>Total Price:</strong> ${booking.totalPrice} ${booking.currency}</li>
      </ul>
      <p>Please keep your ticket code safe for entry.</p>
    `
  }),

  bookingCancellation: (booking) => ({
    subject: `Booking Cancelled - ${booking.ticketCode}`,
    html: `
      <h1>Booking Cancelled</h1>
      <p>Your booking has been cancelled.</p>
      <p><strong>Ticket Code:</strong> ${booking.ticketCode}</p>
      ${booking.cancellationReason ? `<p><strong>Reason:</strong> ${booking.cancellationReason}</p>` : ''}
      <p>If you did not request this cancellation, please contact support.</p>
    `
  }),

  eventApproved: (event) => ({
    subject: `Event Approved - ${event.title}`,
    html: `
      <h1>Your Event Has Been Approved!</h1>
      <p>Great news! Your event "${event.title}" has been approved.</p>
      <p>It is now visible to all users and can accept bookings.</p>
    `
  }),

  eventRejected: (event, reason) => ({
    subject: `Event Rejected - ${event.title}`,
    html: `
      <h1>Event Not Approved</h1>
      <p>Unfortunately, your event "${event.title}" has not been approved.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please review our guidelines and feel free to submit a revised event.</p>
    `
  }),

  passwordReset: (user, token) => ({
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Hi ${user.firstName},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  }),

  accountSuspension: (user) => ({
    subject: 'Account Suspended',
    html: `
      <h1>Account Suspended</h1>
      <p>Dear ${user.firstName},</p>
      <p>Your account has been suspended due to a violation of our terms of service.</p>
      <p>If you believe this is a mistake, please contact our support team.</p>
    `
  })
};

/**
 * Send email helper function
 */
const sendEmail = async (to, subject, html) => {
  try {
    // Skip if no email configured (development mode)
    if (!process.env.SMTP_USER) {
      console.log('Email not configured. Skipping email to:', to);
      console.log('Subject:', subject);
      return { success: true, message: 'Email skipped (not configured)' };
    }

    const info = await transporter.sendMail({
      from: `"Smart Event Booking" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Email service functions
const emailService = {
  sendWelcomeEmail: async (user) => {
    const template = emailTemplates.welcome(user);
    return sendEmail(user.email, template.subject, template.html);
  },

  sendBookingConfirmation: async (booking) => {
    const template = emailTemplates.bookingConfirmation(booking);
    const user = await require('../models').User.findById(booking.user);
    if (user) {
      return sendEmail(user.email, template.subject, template.html);
    }
  },

  sendBookingCancellation: async (booking) => {
    const template = emailTemplates.bookingCancellation(booking);
    const user = await require('../models').User.findById(booking.user);
    if (user) {
      return sendEmail(user.email, template.subject, template.html);
    }
  },

  sendEventApprovedEmail: async (event) => {
    const template = emailTemplates.eventApproved(event);
    const organizer = await require('../models').User.findById(event.organizer);
    if (organizer) {
      return sendEmail(organizer.email, template.subject, template.html);
    }
  },

  sendEventRejectedEmail: async (event, reason) => {
    const template = emailTemplates.eventRejected(event, reason);
    const organizer = await require('../models').User.findById(event.organizer);
    if (organizer) {
      return sendEmail(organizer.email, template.subject, template.html);
    }
  },

  sendPasswordResetEmail: async (user, token) => {
    const template = emailTemplates.passwordReset(user, token);
    return sendEmail(user.email, template.subject, template.html);
  },

  sendAccountSuspensionEmail: async (user) => {
    const template = emailTemplates.accountSuspension(user);
    return sendEmail(user.email, template.subject, template.html);
  }
};

module.exports = emailService;