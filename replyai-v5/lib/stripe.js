import Stripe from "stripe";
let _stripe=null;
export function getStripe(){
  if(!_stripe){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error("STRIPE_SECRET_KEY not set");_stripe=new Stripe(key,{apiVersion:"2024-06-20"});}
  return _stripe;
}
export async function createCheckoutSession({userId,email,priceId,successUrl,cancelUrl,customerId}){
  const stripe=getStripe();
  const params={mode:"subscription",payment_method_types:["card"],line_items:[{price:priceId,quantity:1}],success_url:successUrl,cancel_url:cancelUrl,client_reference_id:String(userId),metadata:{userId:String(userId)},subscription_data:{metadata:{userId:String(userId)}}};
  if(customerId)params.customer=customerId; else params.customer_email=email;
  return stripe.checkout.sessions.create(params);
}
export async function createPortalSession({customerId,returnUrl}){
  return getStripe().billingPortal.sessions.create({customer:customerId,return_url:returnUrl});
}
export function planFromPriceId(priceId){
  const map={[process.env.STRIPE_PRICE_PRO_MONTHLY]:"pro",[process.env.STRIPE_PRICE_PRO_ANNUAL]:"pro",[process.env.STRIPE_PRICE_BIZ_MONTHLY]:"business",[process.env.STRIPE_PRICE_BIZ_ANNUAL]:"business"};
  return map[priceId]||"free";
}
