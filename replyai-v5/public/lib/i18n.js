/**
 * lib/i18n.js — Multilingual support for ReplyAI
 * Supports: English (en) · Polish (pl) · Brazilian Portuguese (pt)
 * Booksy references removed — booking is 100% internal.
 */

const PL_WORDS = [
  "cześć","czesc","hej","witaj","witam","dzień dobry","dzien dobry",
  "chcę","chce","chciałbym","chciałabym",
  "zapisać","zapisac","zapisz","rezerwacja","rezerwacje","rezerwacji",
  "termin","terminy","umówić","umowic","umów","umow",
  "wizyta","wizyty","jak","gdzie","kiedy","ile","co",
  "proszę","prosze","dziękuję","dziekuje","dzięki",
  "nie","tak","dobra","okej","salon","fryzjer","kosmetyczka","się","sie",
];

const PT_WORDS = [
  "olá","ola","oi","bom dia","boa tarde","boa noite",
  "agendar","agendamento","marcar","marcação","marcacao",
  "consulta","consultas","horário","horario","disponível","disponivel",
  "quero","gostaria","preciso","pode","obrigado","obrigada",
  "como","quando","onde","qual","por favor",
  "reserva","reservar","atendimento",
];

const BOOKING_WORDS = {
  en: ["book","booking","appointment","reserve","reservation","schedule","slot","visit"],
  pl: ["rezerwacja","zapisać","zapisac","zapisz","rezerwacje","termin","terminy","wizyta","wizyty","umówić","umow"],
  pt: ["agendar","agendamento","marcar","marcação","consulta","reservar","reserva","horário","horario"],
};

export const responses = {
  en: {
    greeting:      "Hi! 👋 How can I help you today?",
    welcome_dm:    "Hi 👋\nThanks for your message!\nWant to book an appointment? Type 'booking' 📅",
    booking_start: "I'd love to help you book an appointment!",
    booking_none:  "To book an appointment, please contact us directly.",
    ask_date:      "What date would you like? (e.g. 2025-06-15)",
    ask_name:      "What is your name?",
    confirm:       "Booking confirmed ✅",
    slot_taken:    "Sorry, that date is not available 😔 Please choose another date.",
    fallback:      "Sorry, I couldn't find an answer 😔 Try rephrasing or contact us directly.",
    no_faqs:       "No FAQs set up yet. Please check back later!",
    invalid_date:  "Please enter a valid date (e.g. 2025-06-15 or June 15).",
    invalid_name:  "Please enter your name.",
    spam_block:    "Too many requests. Please wait a moment.",
  },
  pl: {
    greeting:      "Cześć! 👋 W czym mogę pomóc?",
    welcome_dm:    "Cześć 👋\nDziękujemy za wiadomość!\nChcesz się zapisać? Napisz 'rezerwacja' 📅",
    booking_start: "Chętnie pomogę Ci zarezerwować wizytę!",
    booking_none:  "Aby umówić wizytę, skontaktuj się z nami bezpośrednio.",
    ask_date:      "Jaki termin Ci odpowiada? (np. 2025-06-15)",
    ask_name:      "Jak masz na imię?",
    confirm:       "Rezerwacja potwierdzona ✅",
    slot_taken:    "Niestety ten termin jest niedostępny 😔 Wybierz inną datę.",
    fallback:      "Nie znalazłem odpowiedzi 😔 Spróbuj inaczej lub skontaktuj się z nami.",
    no_faqs:       "Nie dodano jeszcze FAQ. Sprawdź ponownie później!",
    invalid_date:  "Podaj prawidłową datę (np. 2025-06-15 lub 15 czerwca).",
    invalid_name:  "Podaj swoje imię.",
    spam_block:    "Zbyt wiele zapytań. Poczekaj chwilę.",
  },
  pt: {
    greeting:      "Olá! 👋 Como posso ajudar?",
    welcome_dm:    "Olá 👋\nObrigado pela sua mensagem!\nQuer agendar um horário? Escreva 'agendar' 📅",
    booking_start: "Adorarei ajudá-lo a agendar um horário!",
    booking_none:  "Para agendar, entre em contato conosco diretamente.",
    ask_date:      "Qual data você prefere? (ex: 2025-06-15)",
    ask_name:      "Qual é o seu nome?",
    confirm:       "Agendamento confirmado ✅",
    slot_taken:    "Infelizmente essa data não está disponível 😔 Por favor, escolha outra data.",
    fallback:      "Desculpe, não encontrei uma resposta 😔 Tente reformular ou fale conosco.",
    no_faqs:       "Nenhuma FAQ configurada ainda. Volte em breve!",
    invalid_date:  "Insira uma data válida (ex: 2025-06-15 ou 15 de junho).",
    invalid_name:  "Por favor, insira o seu nome.",
    spam_block:    "Muitas solicitações. Por favor, aguarde um momento.",
  },
};

export function detectLanguage(text) {
  if (!text || typeof text !== "string") return "en";
  const lower = text.toLowerCase();
  for (const word of PT_WORDS) { if (lower.includes(word)) return "pt"; }
  for (const word of PL_WORDS) { if (lower.includes(word)) return "pl"; }
  return "en";
}

export function detectBookingIntent(text, lang = "en") {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();
  const words = [...(BOOKING_WORDS[lang] || []), ...BOOKING_WORDS.en];
  return words.some((w) => lower.includes(w));
}

export function t(key, lang = "en", ...args) {
  const locale = responses[lang] || responses.en;
  const val = locale[key] ?? responses.en[key];
  if (typeof val === "function") return val(...args);
  return val ?? key;
}
