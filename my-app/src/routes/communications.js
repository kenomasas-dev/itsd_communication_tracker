const express = require('express');
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Submit communication
router.post('/', async (req, res) => {
  const {
    direction,
    kindOfCommunication,
    typeOfCommunication,
    communicationDate,
    organization,
    subject,
    details,
    receivedBy,
    assignedTo,
    tags,
    followUpRequired,
    priorityLevel,
    attachments,
    approval
  } = req.body;

  try {
    // Validate required fields
    if (!direction || !kindOfCommunication || !typeOfCommunication || !communicationDate || !organization || !subject || !details) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    console.log('Inserting communication with data:', {
      direction,
      kindOfCommunication,
      typeOfCommunication,
      communicationDate,
      organization,
      subject,
      details,
      receivedBy,
      assignedTo,
      tags,
      followUpRequired,
      priorityLevel,
      attachments,
      approval
    });

    const tableName = approval === 'Required' ? 'itsd_schema.approval' : 'itsd_schema.communications';

    // Generate Random 6-digit Tracking ID
    const year = new Date(communicationDate || Date.now()).getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const trackingId = `ITSD-${year}-${randomNum}`;

    const result = await pool.query(
      `INSERT INTO ${tableName} 
       (tracking_id, direction, kind_of_communication, type_of_communication, communication_date, organization, subject, details, received_by, assigned_to, tags, follow_up_required, priority_level, attachments, status, approval)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id, tracking_id, created_at, status`,
      [trackingId, direction, kindOfCommunication, typeOfCommunication, communicationDate, organization, subject, details, receivedBy || null, assignedTo || null, tags, followUpRequired, priorityLevel, JSON.stringify(attachments || []), approval === 'Required' ? 'pending_approval' : 'pending', approval || 'Not Required']
    );

    console.log(`Communication inserted successfully into ${tableName}:`, result.rows[0]);

    res.json({
      success: true,
      message: 'Communication submitted successfully',
      id: result.rows[0].id,
      table: tableName,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Communication submission error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Get all communications
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM itsd_schema.communications ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload and replace attachment (MUST be before GET/:id)
router.post('/upload', upload.single('file'), async (req, res) => {
  const { communicationId, attachmentIndex, targetTable = 'itsd_schema.communications' } = req.body;

  try {
    if (!communicationId || !req.file) {
      return res.status(400).json({ message: 'Missing communicationId or file' });
    }

    // Ensure the table name is safe to prevent SQL injection
    const allowedTables = ['itsd_schema.communications', 'itsd_schema.approval'];
    const safeTable = allowedTables.includes(targetTable) ? targetTable : 'itsd_schema.communications';

    // Get current communication or approval
    const currentResult = await pool.query(
      `SELECT * FROM ${safeTable} WHERE id = $1`,
      [communicationId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Communication or Approval not found' });
    }

    const communication = currentResult.rows[0];
    let attachments = [];

    // Parse existing attachments
    if (communication.attachments) {
      try {
        attachments = typeof communication.attachments === 'string'
          ? JSON.parse(communication.attachments)
          : communication.attachments;
      } catch (e) {
        attachments = [];
      }
    }

    // Create new attachment object
    const newAttachment = {
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      path: req.file.path,
      filename: req.file.filename,
      uploadedAt: new Date().toISOString()
    };

    // Replace attachment at index or add as new
    const index = parseInt(attachmentIndex);
    if (index >= 0 && index < attachments.length) {
      // IMMUTABLE VERSION HISTORY: Instead of overwriting, append a new version!
      // But we still want to keep the main list ordered so latest is at the end.
      const oldAttachment = attachments[index];
      // rename the new attachment to indicate it's a version
      newAttachment.name = newAttachment.name.replace('.pdf', '') + `_V${attachments.length + 1}.pdf`;
      attachments.push(newAttachment);
      console.log(`Appended new version for attachment at index ${index}:`, newAttachment);
    } else if (index === -1 && communication.attachment) {
      // Update single attachment field
      await pool.query(
        `UPDATE ${safeTable} SET attachment = $1, attachment_name = $2 WHERE id = $3`,
        [newAttachment.url, newAttachment.name, communicationId]
      );
      console.log('Replaced single attachment field');
    } else if (index === -2 && communication.attachment_url) {
      // Update attachment_url field
      await pool.query(
        `UPDATE ${safeTable} SET attachment_url = $1, attachment_filename = $2 WHERE id = $3`,
        [newAttachment.url, newAttachment.name, communicationId]
      );
      console.log('Replaced attachment_url field');
    } else {
      // Add to attachments array
      attachments.push(newAttachment);
      console.log('Added new attachment to array');
    }

    // Update database with new attachments array
    const updateResult = await pool.query(
      `UPDATE ${safeTable} SET attachments = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(attachments), communicationId]
    );

    console.log('Database update successful. New attachments:', attachments);
    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Approve communication (update status to approved)
router.put('/approve/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch current communication to get attachments and tracking_id
    const commResult = await pool.query('SELECT * FROM itsd_schema.communications WHERE id = $1', [id]);
    if (commResult.rows.length === 0) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    const comm = commResult.rows[0];
    let attachments = [];
    if (comm.attachments) {
      try {
        attachments = typeof comm.attachments === 'string' ? JSON.parse(comm.attachments) : comm.attachments;
      } catch (e) { attachments = []; }
    }

    // 2. Automagically watermark PDFs
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      if (att && att.path && typeof att.path === 'string' && att.path.toLowerCase().endsWith('.pdf') && fs.existsSync(att.path)) {
        try {
          const pdfBytes = fs.readFileSync(att.path);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = pdfDoc.getPages();

          if (pages.length > 0) {
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();

            // Generate QR Code
            const qrText = `ITSD Tracking ID: ${comm.tracking_id}\nApproved: ${new Date().toLocaleString()}`;
            const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1 });
            const qrImageBase64 = qrDataUrl.split(',')[1];
            const qrImage = await pdfDoc.embedPng(Buffer.from(qrImageBase64, 'base64'));

            // Draw QR code and text at top right corner
            const qrDims = qrImage.scale(0.5); // Adjust scale to fit nicely
            firstPage.drawImage(qrImage, {
              x: width - qrDims.width - 20,
              y: height - qrDims.height - 20,
              width: qrDims.width,
              height: qrDims.height,
            });

            const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            firstPage.drawText(`VERIFIED: ${comm.tracking_id}`, {
              x: width - qrDims.width - 120,
              y: height - 30,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0.4, 0.2),
            });

            // Save modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            const newFileName = att.name ? att.name.replace('.pdf', '') + '_Watermarked.pdf' : `Document_${Date.now()}_Watermarked.pdf`;
            const newFilePath = att.path.replace('.pdf', `_${Date.now()}_watermarked.pdf`);
            const newUrl = att.url.replace('.pdf', `_${Date.now()}_watermarked.pdf`);

            fs.writeFileSync(newFilePath, modifiedPdfBytes);

            // Update attachment record
            attachments[i] = { ...att, name: newFileName, path: newFilePath, url: newUrl, watermarked: true };
          }
        } catch (err) {
          console.error(`Failed to watermark PDF at ${att.path}:`, err);
        }
      }
    }

    // 3. Save approved status and updated attachments
    const result = await pool.query(
      'UPDATE itsd_schema.communications SET status = $1, updated_at = CURRENT_TIMESTAMP, attachments = $2 WHERE id = $3 RETURNING *',
      ['approved', JSON.stringify(attachments), id]
    );

    console.log('Communication approved and optionally watermarked:', id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Reject communication (update status to rejected)
router.put('/reject/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE itsd_schema.communications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['rejected', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    console.log('Communication rejected:', id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get all pending approvals
router.get('/approvals/pending', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM itsd_schema.approval WHERE status = 'pending_approval' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Transfer document from approval to main communications table
router.put('/approvals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get from approval table
    const result = await client.query('SELECT * FROM itsd_schema.approval WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Approval document not found' });
    }

    const doc = result.rows[0];

    // Insert into communications table with original created_at
    const insertResult = await client.query(
      `INSERT INTO itsd_schema.communications 
       (tracking_id, direction, kind_of_communication, type_of_communication, communication_date, organization, subject, details, received_by, assigned_to, tags, follow_up_required, priority_level, attachments, status, approval, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [doc.tracking_id, doc.direction, doc.kind_of_communication, doc.type_of_communication, doc.communication_date, doc.organization, doc.subject, doc.details, doc.received_by, doc.assigned_to, doc.tags, doc.follow_up_required, doc.priority_level, JSON.stringify(doc.attachments || []), 'pending', doc.approval, doc.created_at]
    );

    // Remove from approval table
    await client.query('DELETE FROM itsd_schema.approval WHERE id = $1', [id]);

    await client.query('COMMIT');
    console.log('Document transferred from approval to communications:', id);
    res.json({ success: true, communication: insertResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approval transfer error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// Reject document in approval table
router.put('/approvals/:id/reject', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE itsd_schema.approval SET status = 'rejected' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Approval document not found' });
    }
    console.log('Document rejected in approval:', id);
    res.json({ success: true, document: result.rows[0] });
  } catch (error) {
    console.error('Approval reject error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get communication by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM itsd_schema.communications WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
