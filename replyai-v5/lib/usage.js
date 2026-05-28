import getDb, { dbGet } from "./db";
import { getPlan, withinLimit } from "./plans";

function monthStart() {
  const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}

export async function getUsage(userId) {
  const db=await getDb(); const from=monthStart();
  const [b,m,f,s]=await Promise.all([
    dbGet(db,"SELECT COUNT(*) AS n FROM appointments WHERE user_id=$1 AND date>=$2",[userId,from]),
    dbGet(db,"SELECT COUNT(*) AS n FROM messages WHERE user_id=$1 AND created_at>=$2",[userId,from]),
    dbGet(db,"SELECT COUNT(*) AS n FROM faqs WHERE user_id=$1",[userId]),
    dbGet(db,"SELECT COUNT(*) AS n FROM services WHERE user_id=$1",[userId]),
  ]);
  return {
    bookingsMonth:Number(b?.n||b?.count||0),
    messagesMonth:Number(m?.n||m?.count||0),
    faqs:Number(f?.n||f?.count||0),
    services:Number(s?.n||s?.count||0),
  };
}

export async function checkLimit(userId,plan,limitKey) {
  const usage=await getUsage(userId); const current=usage[limitKey]??0;
  if (!withinLimit(plan,limitKey,current)) {
    const limit=getPlan(plan).limits[limitKey];
    const labels={bookingsMonth:"bookings this month",messagesMonth:"messages this month",faqs:"FAQ entries",services:"services"};
    return {allowed:false,error:`You've reached the limit of ${limit} ${labels[limitKey]||limitKey} on the ${plan} plan. Upgrade to continue.`,upgradeRequired:true};
  }
  return {allowed:true};
}
