// Wraps a template body with the admin-editable global header and footer.
// Table-based layout for compatibility with older email clients (notably
// Outlook desktop). Mailgun substitutes any %recipient.xxx% placeholders
// left in the output per-recipient at send time.
export function renderEmail({
  subject,
  bodyHtml,
  headerHtml,
  footerHtml,
}: {
  subject: string;
  bodyHtml: string;
  headerHtml: string;
  footerHtml: string;
}) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f8fafc; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
            <tr>
              <td style="background-color:#437023; padding:20px 32px; font-family: Arial, Helvetica, sans-serif;">
                ${headerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:32px; color:#0f172a; font-size:15px; line-height:1.6; font-family: Arial, Helvetica, sans-serif;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0; color:#64748b; font-size:12px; line-height:1.6; font-family: Arial, Helvetica, sans-serif;">
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
