/**
 * Fonnte WhatsApp API helper (A5)
 * Docs: https://fonnte.com/docs
 *
 * Set FONNTE_API_TOKEN in your .env.local file.
 */

interface SendWAParams {
  /** Target phone number in format: 628xxxxxxxxxx */
  target: string;
  message: string;
}

export async function sendWhatsApp({ target, message }: SendWAParams): Promise<boolean> {
  const token = process.env.FONNTE_API_TOKEN;
  if (!token) {
    console.warn('[Fonnte] FONNTE_API_TOKEN not configured. Skipping WA send.');
    return false;
  }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: '62',
      }),
    });

    if (!res.ok) {
      console.error('[Fonnte] HTTP error:', res.status, await res.text());
      return false;
    }

    const data = await res.json();
    // Fonnte returns { status: true } on success
    return data.status === true;
  } catch (err) {
    console.error('[Fonnte] Send error:', err);
    return false;
  }
}
