import { requireAuth } from "../../../lib/auth";
import { createCheckoutSession } from "../../../lib/stripe";
import getDb, { dbGet } from "../../../lib/db";

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).end();
  const user=requireAuth(req,res); if(!user)return;
  const {priceId}=req.body||{};
  if(!priceId)return res.status(400).json({error:"priceId is required."});
  const db=await getDb();
  const dbUser=await dbGet(db,"SELECT email,stripe_customer_id FROM users WHERE id=$1",[user.id]);
  if(!dbUser)return res.status(404).json({error:"User not found."});
  const base=process.env.SITE_URL||"http://localhost:3000";
  try {
    const session=await createCheckoutSession({userId:user.id,email:dbUser.email,priceId,customerId:dbUser.stripe_customer_id||undefined,successUrl:`${base}/dashboard?upgraded=1`,cancelUrl:`${base}/pricing`});
    return res.status(200).json({url:session.url});
  } catch(err){console.error("[stripe/checkout]",err.message);return res.status(500).json({error:"Failed to create checkout session."});}
}
