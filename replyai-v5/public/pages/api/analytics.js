import getDb, { dbAll, dbGet } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { getUsage } from "../../lib/usage";
import { getPlan } from "../../lib/plans";

export default async function handler(req,res){
  if(req.method!=="GET")return res.status(405).end();
  const user=requireAuth(req,res); if(!user)return;
  const db=await getDb();
  const now=new Date(), y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,"0");
  const monthStart=`${y}-${m}-01`;
  const last30=new Date(now-30*24*60*60*1000).toISOString().slice(0,10);
  const last7=new Date(now-7*24*60*60*1000).toISOString().slice(0,10);
  const [tb,bm,b7,tm,mm,mis,tf,ts,busy,byDay,recent]=await Promise.all([
    dbGet(db,"SELECT COUNT(*) AS n FROM appointments WHERE user_id=$1",[user.id]),
    dbGet(db,"SELECT COUNT(*) AS n FROM appointments WHERE user_id=$1 AND date>=$2",[user.id,monthStart]),
    dbGet(db,"SELECT COUNT(*) AS n FROM appointments WHERE user_id=$1 AND date>=$2",[user.id,last7]),
    dbGet(db,"SELECT COUNT(*) AS n FROM messages WHERE user_id=$1",[user.id]),
    dbGet(db,"SELECT COUNT(*) AS n FROM messages WHERE user_id=$1 AND created_at>=$2",[user.id,monthStart]),
    dbGet(db,"SELECT COUNT(*) AS n FROM missed_messages WHERE user_id=$1",[user.id]),
    dbGet(db,"SELECT COUNT(*) AS n FROM faqs WHERE user_id=$1",[user.id]),
    dbGet(db,"SELECT COUNT(*) AS n FROM services WHERE user_id=$1",[user.id]),
    dbAll(db,"SELECT SUBSTR(start_time,1,2) AS hour,COUNT(*) AS count FROM appointments WHERE user_id=$1 GROUP BY hour ORDER BY count DESC LIMIT 6",[user.id]),
    dbAll(db,"SELECT date,COUNT(*) AS count FROM appointments WHERE user_id=$1 AND date>=$2 GROUP BY date ORDER BY date ASC",[user.id,last30]),
    dbAll(db,"SELECT a.client_name,a.date,a.start_time,a.end_time,s.name AS service_name FROM appointments a LEFT JOIN services s ON s.id=a.service_id WHERE a.user_id=$1 ORDER BY a.date DESC,a.start_time DESC LIMIT 5",[user.id]),
  ]);
  const n=v=>Number(v?.n||v?.count||0);
  const usage=await getUsage(user.id);
  const plan=getPlan(user.plan||"free");
  const pct=(u,l)=>l===-1?0:Math.min(100,Math.round((u/l)*100));
  return res.status(200).json({
    totalBookings:n(tb),bookingsThisMonth:n(bm),bookingsLast7:n(b7),
    totalMessages:n(tm),messagesThisMonth:n(mm),missedMessages:n(mis),
    totalFaqs:n(tf),totalServices:n(ts),
    busyHours:(busy||[]).map(r=>({hour:`${r.hour}:00`,count:n(r)})),
    bookingsByDay:byDay||[],
    recentBookings:recent||[],
    plan:user.plan||"free",
    usage:{
      bookingsMonth:{used:usage.bookingsMonth,limit:plan.limits.bookingsMonth,pct:pct(usage.bookingsMonth,plan.limits.bookingsMonth)},
      messagesMonth:{used:usage.messagesMonth,limit:plan.limits.messagesMonth,pct:pct(usage.messagesMonth,plan.limits.messagesMonth)},
      faqs:{used:usage.faqs,limit:plan.limits.faqs,pct:pct(usage.faqs,plan.limits.faqs)},
      services:{used:usage.services,limit:plan.limits.services,pct:pct(usage.services,plan.limits.services)},
    },
  });
}
