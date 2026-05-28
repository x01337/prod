import { getStripe, planFromPriceId } from "../../../lib/stripe";
import getDb, { dbGet, dbRun } from "../../../lib/db";
export const config={api:{bodyParser:false}};
function getRawBody(req){return new Promise((res,rej)=>{const c=[];req.on("data",d=>c.push(d));req.on("end",()=>res(Buffer.concat(c)));req.on("error",rej);});}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).end();
  const raw=await getRawBody(req);
  const sig=req.headers["stripe-signature"];
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!secret){console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");return res.status(500).end();}
  let event;
  try{event=getStripe().webhooks.constructEvent(raw,sig,secret);}
  catch(err){console.error("[webhook] Bad signature",err.message);return res.status(400).end();}
  res.status(200).json({received:true});
  try{await handleEvent(event);}catch(err){console.error("[webhook] handler error",err.message);}
}
async function handleEvent(event){
  const db=await getDb();
  if(event.type==="checkout.session.completed"){
    const s=event.data.object;
    const userId=s.metadata?.userId||s.client_reference_id;
    const sub=await getStripe().subscriptions.retrieve(s.subscription);
    const plan=planFromPriceId(sub.items.data[0]?.price?.id);
    if(userId) await dbRun(db,"UPDATE users SET plan=$1,stripe_customer_id=$2,stripe_subscription_id=$3,subscription_status=$4 WHERE id=$5",[plan,s.customer,s.subscription,"active",userId]);
  } else if(event.type==="customer.subscription.updated"){
    const sub=event.data.object;
    const user=await dbGet(db,"SELECT id FROM users WHERE stripe_customer_id=$1",[sub.customer]);
    if(user){const plan=planFromPriceId(sub.items.data[0]?.price?.id);await dbRun(db,"UPDATE users SET plan=$1,subscription_status=$2,stripe_subscription_id=$3 WHERE id=$4",[sub.status==="active"?plan:"free",sub.status,sub.id,user.id]);}
  } else if(event.type==="customer.subscription.deleted"){
    const sub=event.data.object;
    const user=await dbGet(db,"SELECT id FROM users WHERE stripe_customer_id=$1",[sub.customer]);
    if(user) await dbRun(db,"UPDATE users SET plan='free',subscription_status='canceled',stripe_subscription_id='' WHERE id=$1",[user.id]);
  } else if(event.type==="invoice.payment_failed"){
    const inv=event.data.object;
    const user=await dbGet(db,"SELECT id FROM users WHERE stripe_customer_id=$1",[inv.customer]);
    if(user) await dbRun(db,"UPDATE users SET subscription_status='past_due' WHERE id=$1",[user.id]);
  }
}
