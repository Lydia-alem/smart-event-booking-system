/**
 * PDF Service
 * Generates PDF tickets for bookings using PDFKit
 *
 * REST PRINCIPLES APPLIED:
 * - Resource representation: PDF as a representation of booking resource
 * - Downloads via GET /bookings/:id/download (200 OK)
 * - Stateless: PDF generated on-demand, no stored session
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure tickets directory exists
const ticketsDir = path.join(__dirname, '../../tickets');
if (!fs.existsSync(ticketsDir)) {
  fs.mkdirSync(ticketsDir, { recursive: true });
}

/**
 * Generate a PDF ticket for a booking
 * @param {Object} booking - Booking document with populated event and user
 * @returns {Promise<string>} - Path to generated PDF
 */
const generateTicket = async (booking) => {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `ticket-${booking.ticketCode}.pdf`;
      const filePath = path.join(ticketsDir, fileName);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Pipe to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header with logo area
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .text('EVENT TICKET', { align: 'center' });

      doc.moveDown();

      // Ticket code (barcode placeholder)
      doc.fontSize(16)
        .font('Helvetica')
        .text(`Ticket Code: ${booking.ticketCode}`, { align: 'center' });

      doc.moveDown(2);

      // Event Details
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .text(booking.event?.title || 'Event', { align: 'center' });

      doc.moveDown();

      // Event info table
      const startDate = booking.event?.startDate ? new Date(booking.event.startDate) : new Date();
      const formattedDate = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = startDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.fontSize(12)
        .font('Helvetica');

      // Left column
      doc.text(`Date: ${formattedDate}`, 100, doc.y);
      doc.text(`Time: ${formattedTime}`, 100, doc.y + 20);

      // Right column
      doc.text(`Tickets: ${booking.ticketsCount}`, 350, doc.y - 20);
      doc.text(`Price: ${booking.totalPrice} ${booking.currency}`, 350, doc.y + 20);

      doc.moveDown(3);

      // Location
      if (booking.event?.location) {
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .text('Location:', 100);

        doc.fontSize(12)
          .font('Helvetica')
          .text(booking.event.location.venue || 'Venue TBA', 100);

        if (!booking.event.location.isOnline && booking.event.location.address) {
          const addr = booking.event.location.address;
          doc.text(`${addr.city || ''}, ${addr.country || ''}`, 100);
        }
      }

      // User info
      doc.moveDown(2);
      doc.fontSize(10)
        .text(`Booked by: ${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`, 100);
      doc.text(`Email: ${booking.user?.email || ''}`, 100);

      // Footer
      doc.moveDown(3);
      doc.fontSize(8)
        .text('Please present this ticket at the venue entrance.', { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Delete a ticket PDF
 * @param {string} ticketPath - Path to ticket file
 */
const deleteTicket = async (ticketPath) => {
  try {
    if (fs.existsSync(ticketPath)) {
      fs.unlinkSync(ticketPath);
    }
  } catch (error) {
    console.error('Failed to delete ticket:', error);
  }
};

module.exports = {
  generateTicket,
  deleteTicket
};