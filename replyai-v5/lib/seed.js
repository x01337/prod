// lib/seed.js  —  Default FAQ entries with pre-built keyword index.
// Inserted once on first boot if the faqs table is empty.

export const SEED_FAQS = [
  {
    question: "How do I reset my password?",
    answer: "Click 'Forgot password' on the login page, enter your email, and follow the link we send you. The link expires in 30 minutes.",
    keywords: "reset password forgot recover restore change update fix pass passwd passphrase credentials login credential pwd",
  },
  {
    question: "What is your refund policy?",
    answer: "We offer a full refund within 30 days of purchase, no questions asked. Contact support@example.com to initiate.",
    keywords: "refund policy return money back reimburse reimbursement cancel chargeback repay",
  },
  {
    question: "How do I contact support?",
    answer: "Reach us at support@example.com, via live chat (bottom-right button), or call +1-800-123-4567 weekdays 9am–6pm EST.",
    keywords: "contact support reach help email call chat speak talk",
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes! Every new account gets a 14-day free trial with full access. No credit card required.",
    keywords: "offer free trial demo gratis no cost complimentary without paying discount coupon promo",
  },
  {
    question: "How much does the Pro plan cost?",
    answer: "The Pro plan is $29/month (monthly billing) or $19/month (annual billing, $228/year).",
    keywords: "price cost fee charge rate pricing pro plan tier subscription package how much",
  },
  {
    question: "How do I cancel my subscription?",
    answer: "Go to Settings → Billing → Cancel Subscription. Your access continues until the end of the billing period.",
    keywords: "cancel subscription stop terminate end quit discontinue billing",
  },
  {
    question: "Is there a mobile app?",
    answer: "Yes, our app is available for free on iOS (App Store) and Android (Google Play).",
    keywords: "mobile app phone ios android download",
  },
  {
    question: "How do I delete my account?",
    answer: "Email support@example.com with subject 'Delete my account'. We'll process it within 2 business days.",
    keywords: "delete account remove erase close deactivate terminate profile",
  },
  {
    question: "How do I upgrade my plan?",
    answer: "Go to Settings → Billing → Change Plan and select the plan you want. Changes take effect immediately.",
    keywords: "upgrade plan improve premium pro paid advanced tier subscription pricing",
  },
  {
    question: "How do I integrate with other tools?",
    answer: "We offer integrations with Slack, Zapier, HubSpot, and more. Go to Settings → Integrations to connect.",
    keywords: "integrate connect sync link api webhook tools",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use AES-256 encryption at rest and TLS 1.3 in transit. We are SOC 2 Type II certified.",
    keywords: "data secure security privacy encryption safe",
  },
  {
    question: "Do you support multiple languages?",
    answer: "We currently support English, Spanish, French, German, and Portuguese. More languages coming soon.",
    keywords: "language languages multilingual international support",
  },
];
