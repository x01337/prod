/**
 * lib/bookingFlow.js — Multi-step booking conversation engine
 * State: idle → ask_date → ask_name → done
 * Cancel at any step → idle
 */
import getDb, { dbRun, checkAvailability, markDateUnavailable, logMessage } from "./db";
import { t } from "./i18n";
import { detectIntent } from "./intents";
import { getSession, createSession, updateSession, clearSession, isSpam, parseDate } from "./bookingSession";

export async function processBookingMessage(senderId, text, lang, userId = 1, source = "web") {
  try {
    if (isSpam(senderId)) {
      return { reply: t("spam_block", lang), done: false, isBooking: false, intent: "spam" };
    }

    const { intent, confidence } = detectIntent(text, lang);

    // Cancel at any point
    if (intent === "cancel") {
      clearSession(senderId);
      await logMessage({ userId, phone: senderId, text, type: "incoming", language: lang, intent: "cancel", source });
      const reply = lang === "pl" ? "Dobrze, anulowałem. W czym mogę pomóc? 😊"
        : lang === "pt" ? "Ok, cancelei. Como posso ajudar? 😊"
        : "No problem, booking cancelled. How can I help? 😊";
      return { reply, done: false, isBooking: false, intent: "cancel" };
    }

    const session = getSession(senderId);

    if (session) {
      if (session.step === "ask_date") {
        const date = parseDate(text);
        if (!date) {
          await logMessage({ userId, phone: senderId, text, type: "incoming", language: lang, intent: "booking", source });
          return { reply: t("invalid_date", lang), done: false, isBooking: true, intent: "booking" };
        }
        // Check availability (default 09:00–10:00 for chat bookings)
        const available = await checkAvailability(userId, date, "09:00", "23:59");
        if (!available) {
          await logMessage({ userId, phone: senderId, text, type: "incoming", language: lang, intent: "booking", source });
          return { reply: t("slot_taken", lang), done: false, isBooking: true, intent: "booking" };
        }
        updateSession(senderId, { step: "ask_name", date });
        await logMessage({ userId, phone: senderId, text, type: "incoming", language: lang, intent: "booking", source });
        return { reply: t("ask_name", lang), done: false, isBooking: true, intent: "booking" };
      }

      if (session.step === "ask_name") {
        const name = text.trim();
        if (!name || name.length < 2) {
          await logMessage({ userId, phone: senderId, text, type: "incoming", language: lang, intent: "booking", source });
          return { reply: t("invalid_name", lang), done: false, isBooking: true, intent: "booking" };
        }
        updateSession(senderId, { step: "done", name });
        try {
          const db = await getDb();
          await dbRun(db,
            "INSERT INTO appointments (user_id, client_name, phone, date, start_time, end_time, language, source, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
            [userId, name, senderId, session.date, "09:00", "10:00", lang, source, "booked"]
          );
          await markDateUnavailable(userId, session.date);
        } catch (err) {
          console.error("[BookingFlow] DB error:", err.message);
        }
        clearSession(senderId);
        await logMessage({ userId, phone: senderId, text: name, type: "incoming", language: lang, intent: "booking", source });
        return { reply: t("confirm", lang), done: true, isBooking: true, intent: "booking" };
      }
    }

    // No active session — start booking flow
    if (intent === "booking" && confidence > 0.1) {
      createSession(senderId, lang);
      await logMessage({ userId, phone: senderId, text, type: "incoming", language: lang, intent: "booking", source });
      return { reply: t("ask_date", lang), done: false, isBooking: true, intent: "booking" };
    }

    return { reply: null, done: false, isBooking: false, intent };
  } catch (err) {
    console.error("[bookingFlow]", err.message);
    return { reply: null, done: false, isBooking: false, intent: "error" };
  }
}
