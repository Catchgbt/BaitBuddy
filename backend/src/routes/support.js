import express from 'express';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email-Transporter (mit Fallback auf Console-Logging)
let emailTransporter;
try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
} catch (e) {
  console.warn('Email-Transporter konnte nicht initialisiert werden:', e.message);
}

// POST /api/support/tickets - Neues Support-Ticket erstellen
router.post('/support/tickets', async (req, res) => {
  try {
    const { subject, category, message, user_email, user_name } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Betreff und Nachricht erforderlich' });
    }

    // Ticket in Supabase speichern
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([
        {
          subject: subject.trim(),
          category: category || 'sonstiges',
          message: message.trim(),
          user_email: user_email || 'unknown@example.com',
          user_name: user_name || 'Anonymer Nutzer',
          status: 'offen',
          created_date: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Supabase-Fehler beim Speichern des Tickets:', error);
      return res.status(500).json({ error: 'Ticket konnte nicht gespeichert werden' });
    }

    const ticket = data?.[0];

    // Email an Support versendet
    if (emailTransporter) {
      const supportEmail = process.env.SUPPORT_EMAIL || 'kaisaschnitt99@gmail.com';
      const mailOptions = {
        from: process.env.SMTP_USER || 'BaitBuddy <noreply@baitbuddy.local>',
        to: supportEmail,
        subject: `[${category?.toUpperCase() || 'TICKET'}] ${subject}`,
        html: `
          <h2>Neues Support-Ticket</h2>
          <p><strong>ID:</strong> ${ticket?.id}</p>
          <p><strong>Von:</strong> ${user_name} (${user_email})</p>
          <p><strong>Kategorie:</strong> ${category}</p>
          <p><strong>Betreff:</strong> ${subject}</p>
          <hr />
          <p><strong>Nachricht:</strong></p>
          <pre>${message}</pre>
          <hr />
          <p><em>Dieses Ticket wurde am ${new Date().toLocaleString('de-DE')} erstellt.</em></p>
        `,
        replyTo: user_email,
      };

      emailTransporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Email-Versand fehlgeschlagen:', err);
        } else {
          console.log('Ticket-Email versendet:', info.response);
        }
      });
    } else {
      console.log('⚠️ Email-Transporter nicht konfiguriert. Ticket-Benachrichtigung skippiert:', {
        ticket_id: ticket?.id,
        subject,
        user_email,
      });
    }

    // Erfolgreiche Antwort an Client
    return res.status(201).json({
      message: 'Ticket erfolgreich erstellt',
      ticket: {
        id: ticket?.id,
        status: 'offen',
      },
    });
  } catch (err) {
    console.error('Fehler beim Erstellen des Tickets:', err);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// GET /api/support/tickets - Tickets des aktuellen Benutzers abrufen
router.get('/support/tickets', async (req, res) => {
  try {
    const userEmail = req.query.user_email || req.query.email;

    if (!userEmail) {
      return res.status(400).json({ error: 'User-Email erforderlich' });
    }

    let query = supabase
      .from('support_tickets')
      .select('*')
      .eq('user_email', userEmail);

    query = query.order('created_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase-Fehler beim Abrufen von Tickets:', error);
      return res.status(500).json({ error: 'Tickets konnten nicht abgerufen werden' });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('Fehler beim Abrufen der Tickets:', err);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;
