import Head from "next/head";
import Link from "next/link";

export default function Terms() {
  return (
    <>
      <Head><title>Terms of Service — ReplyAI</title></Head>
      <LegalPage title="Terms of Service" updated="January 1, 2025">
        <Section title="1. Acceptance">
          <p>By using ReplyAI you agree to these Terms of Service. If you do not agree, do not use the service.</p>
        </Section>
        <Section title="2. Description of Service">
          <p>ReplyAI is a SaaS platform that provides AI-powered chatbot, appointment booking, and FAQ management tools for businesses. The service is provided "as is" and may change over time.</p>
        </Section>
        <Section title="3. Account Responsibilities">
          <ul>
            <li>You must provide accurate information when registering.</li>
            <li>You are responsible for keeping your account credentials secure.</li>
            <li>You may not share your account with others.</li>
            <li>You must be at least 16 years old to use this service.</li>
          </ul>
        </Section>
        <Section title="4. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for illegal purposes or to violate any laws.</li>
            <li>Send spam, harassing, or abusive messages through the platform.</li>
            <li>Attempt to bypass security measures or access other users' data.</li>
            <li>Use the WhatsApp integration in violation of Meta's Terms of Service.</li>
            <li>Reverse engineer, scrape, or copy the service.</li>
          </ul>
        </Section>
        <Section title="5. WhatsApp Usage">
          <p>ReplyAI uses only the official Meta WhatsApp Business API. You are responsible for ensuring your WhatsApp usage complies with Meta's policies, including the 24-hour messaging window rules and template requirements.</p>
        </Section>
        <Section title="6. Data Ownership">
          <p>You retain ownership of all data you input into ReplyAI (FAQs, services, appointments). You grant us a limited license to process this data to provide the service.</p>
        </Section>
        <Section title="7. Limitation of Liability">
          <p>ReplyAI is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from use of the service. Our maximum liability is limited to amounts paid in the last 12 months.</p>
        </Section>
        <Section title="8. Termination">
          <p>You may delete your account at any time. We may suspend accounts that violate these terms. Upon termination, your data will be permanently deleted.</p>
        </Section>
        <Section title="9. Changes to Terms">
          <p>We may update these terms. Continued use of the service after changes constitutes acceptance. We will notify you of material changes by email.</p>
        </Section>
        <Section title="10. Contact">
          <p>Legal questions? Email <a href="mailto:legal@replyai.app" style={{ color: "var(--orange)" }}>legal@replyai.app</a></p>
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
