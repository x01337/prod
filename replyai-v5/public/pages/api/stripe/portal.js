import { requireAuth } from "../../../lib/auth";
import { createPortalSession } from "../../../lib/stripe";
import getDb, { dbGet } from "../../../lib/db";

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).end();
  const user=requireAuth(req,res); if(!user)return;
  const db=await getDb();
  const dbUser=await dbGet(db,"SELECT stripe_customer_id FROM users WHERE id=$1",[user.id]);
  if(!dbUser?.stripe_customer_id)return res.status(400).json({error:"No billing account found. Subscribe to a plan first."});
  const base=process.env.SITE_URL||"http://localhost:3000";
  try {
    const session=await createPortalSession({customerId:dbUser.stripe_customer_id,returnUrl:`${base}/dashboard`});
    return res.status(200).json({url:session.url});
  } catch(err){console.error("[stripe/portal]",err.message);return res.status(500).json({error:"Failed to open billing portal."});}
}
