const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const getStripeReturnPage = (req, res) => {
  const status = String(req.query.status || "success").toLowerCase();
  const sessionId = String(req.query.session_id || "");
  const isSuccess = status === "success";
  const title = isSuccess ? "Payment Processed" : "Payment Not Completed";
  const message = isSuccess
    ? "Stripe finished the checkout flow. You can return to the app or POS screen now."
    : "The Stripe checkout was cancelled or not completed. You can return to the app or POS screen.";

  res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f8fafc;
        --surface: #ffffff;
        --border: #e2e8f0;
        --text: #0f172a;
        --muted: #64748b;
        --accent: #f97316;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: radial-gradient(circle at top, #fff7ed 0%, var(--bg) 55%);
        font-family: Arial, sans-serif;
        color: var(--text);
        padding: 24px;
      }
      .card {
        width: min(460px, 100%);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 28px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: #fff7ed;
        color: var(--accent);
        font-weight: 700;
        margin-bottom: 16px;
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .session {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #f8fafc;
        border: 1px dashed var(--border);
        font-size: 12px;
        color: var(--muted);
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <section class="card">
      <div class="badge">Stripe Checkout</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      ${sessionId ? `<div class="session">Session: ${escapeHtml(sessionId)}</div>` : ""}
    </section>
  </body>
</html>`);
};
