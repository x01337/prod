import Head from "next/head";
import Link from "next/link";

export default function Privacy() {
  return (
    <>
      <Head><title>Privacy Policy — ReplyAI</title></Head>
      <LegalPage title="Privacy Policy" updated="January 1, 2025">
        <Section title="1. What We Collect">
          <p>We collect only what is necessary to provide the service:</p>
          <ul>
            <li><strong>Account data:</strong> email address, hashed password, display name.</li>
            <li><strong>Business data:</strong> FAQs, services, appointment records you create.</li>
            <li><strong>Message logs:</strong> text and metadata of conversations handled by your bot.</li>
            <li><strong>Usage data:</strong> anonymous request counts for rate limiting.</li>
          </ul>
          <p>We do <strong>not</strong> sell your data to third parties.</p>
        </Section>
        <Section title="2. How We Use Your Data">
          <ul>
            <li>Provide and operate the ReplyAI service.</li>
            <li>Send account-related emails (verification, notifications).</li>
            <li>Improve service reliability and performance.</li>
          </ul>
        </Section>
        <Section title="3. Data Storage">
          <p>All data is stored in a PostgreSQL database hosted on infrastructure of your choice. Passwords are never stored in plain text — we use bcrypt with a cost factor of 12.</p>
        </Section>
        <Section title="4. WhatsApp Data">
          <p>When you connect WhatsApp Business API, message content is processed in real-time and stored only as defined in your message log settings. We use only the official Meta WhatsApp Business API — no unofficial scraping.</p>
        </Section>
        <Section title="5. Data Retention">
          <p>Your data is retained as long as your account is active. You can delete your account at any time, which permanently removes all associated data.</p>
        </Section>
        <Section title="6. Your Rights">
          <p>You have the right to access, correct, export, or delete your personal data. Contact us at privacy@replyai.app.</p>
        </Section>
        <Section title="7. Cookies">
          <p>We use one HttpOnly session cookie (<code>ars_token</code>) for authentication. No tracking or advertising cookies.</p>
        </Section>
        <Section title="8. Contact">
          <p>Questions about this policy? Email <a href="mailto:privacy@replyai.app" style={{ color: "var(--orange)" }}>privacy@replyai.app</a></p>
        </Section>
      </LegalPage>
    </>
  );
}

function LegalPage({ title, updated, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <Link href="/" style={{ color: "var(--orange)", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>← Back to ReplyAI</Link>
        </div>
        <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 34, color: "var(--text)", marginBottom: 8 }}>{title}</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 40 }}>Last updated: {updated}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 28, paddingBottom: 28 }}>
      <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 14 }}>{title}</h2>
      <div style={{ color: "var(--text-muted)", lineHeight: 1.8, fontSize: 14, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}
