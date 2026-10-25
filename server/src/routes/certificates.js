const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

let designTokens;
function getDesignTokens() {
  if (designTokens) return designTokens;
  const tokenFile = path.resolve(__dirname, '../../../client/src/index.css');
  const css = fs.readFileSync(tokenFile, 'utf8');
  const token = (name) => {
    const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'));
    if (!match) throw new Error(`Missing design token: --color-${name}`);
    return match[1];
  };
  designTokens = {
    bg: token('bg'),
    border: token('border'),
    accent: token('accent'),
    text: token('text'),
    secondary: token('text-secondary'),
  };
  return designTokens;
}

// Generate certificate for a project completion
router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const userId = req.user.id;

    const member = await prisma.teamMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) return res.status(403).json({ error: 'Not a team member' });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.status !== 'completed') {
      return res.status(400).json({ error: 'Project not completed' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { institution: true },
    });

    // Check existing cert
    let cert = await prisma.certificate.findFirst({ where: { userId, projectId } });
    if (cert) return res.json({ certificate: cert });

    const verificationId = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();

    // Generate QR code
    const verifyUrl = `${process.env.CLIENT_URL}/verify/${verificationId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const colors = getDesignTokens();

    // Generate PDF
    const uploadsDir = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const pdfPath = path.join(uploadsDir, `${verificationId}.pdf`);

    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.bg);

      // Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .stroke(colors.border);

      // Title
      doc.fillColor(colors.text)
        .fontSize(32)
        .font('Helvetica-Bold')
        .text('Certificate of Contribution', { align: 'center' });

      doc.moveDown(0.5);
      doc.fillColor(colors.accent).fontSize(14)
        .text('TeamConnect Collaboration Platform', { align: 'center' });

      doc.moveDown(1.5);
      doc.fillColor(colors.secondary).fontSize(18)
        .text('This certifies that', { align: 'center' });

      doc.moveDown(0.5);
      doc.fillColor(colors.accent).fontSize(28).font('Helvetica-Bold')
        .text(user.fullName, { align: 'center' });

      doc.moveDown(0.5);
      doc.fillColor(colors.secondary).fontSize(16).font('Helvetica')
        .text(`has successfully contributed to the project`, { align: 'center' });

      doc.moveDown(0.3);
      doc.fillColor(colors.accent).fontSize(22).font('Helvetica-Bold')
        .text(`"${project.title}"`, { align: 'center' });

      doc.moveDown(0.5);
      doc.fillColor(colors.secondary).fontSize(12).font('Helvetica')
        .text(`at ${user.institution?.name || 'Institution'}`, { align: 'center' });

      doc.moveDown(1);
      doc.fillColor(colors.secondary).fontSize(10)
        .text(`Verification ID: ${verificationId}`, { align: 'center' });
      doc.text(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

      // QR code
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      doc.image(qrBuffer, doc.page.width - 140, doc.page.height - 140, { width: 100 });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    cert = await prisma.certificate.create({
      data: {
        userId,
        projectId,
        verificationId,
        qrCodeUrl: qrDataUrl,
        pdfUrl: `/uploads/certificates/${verificationId}.pdf`,
      },
    });

    res.status(201).json({ certificate: cert });
  } catch (err) {
    next(err);
  }
});

// Verify certificate by ID (public)
router.get('/verify/:verificationId', async (req, res, next) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { verificationId: req.params.verificationId },
      include: {
        user: { select: { fullName: true, institution: { select: { name: true } } } },
      },
    });
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    const project = await prisma.project.findUnique({ where: { id: cert.projectId }, select: { title: true } });
    res.json({ certificate: cert, project });
  } catch (err) {
    next(err);
  }
});

// Get my certificates
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const certs = await prisma.certificate.findMany({
      where: { userId: req.user.id },
      orderBy: { issuedAt: 'desc' },
    });
    res.json({ certificates: certs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
