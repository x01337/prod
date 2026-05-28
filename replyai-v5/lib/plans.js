export const PLANS = {
  free: {
    id:"free", name:"Free", tagline:"Get started, no card needed",
    price:0, priceAnnual:0,
    stripePriceIdMonthly:null, stripePriceIdAnnual:null,
    limits:{ faqs:15, services:3, bookingsMonth:30, messagesMonth:100, teamMembers:1 },
    features:{ calendar:true, whatsapp:true, telegram:false, aiResponses:false,
      googleCalSync:false, emailNotify:true, analyticsBasic:true, analyticsAdv:false,
      customBranding:false, apiAccess:false, prioritySupport:false },
  },
  pro: {
    id:"pro", name:"Pro", tagline:"For growing businesses",
    price:19, priceAnnual:15,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY||"",
    stripePriceIdAnnual:  process.env.STRIPE_PRICE_PRO_ANNUAL||"",
    limits:{ faqs:200, services:20, bookingsMonth:500, messagesMonth:2000, teamMembers:3 },
    features:{ calendar:true, whatsapp:true, telegram:true, aiResponses:true,
      googleCalSync:true, emailNotify:true, analyticsBasic:true, analyticsAdv:true,
      customBranding:false, apiAccess:true, prioritySupport:false },
  },
  business: {
    id:"business", name:"Business", tagline:"For teams and agencies",
    price:49, priceAnnual:39,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BIZ_MONTHLY||"",
    stripePriceIdAnnual:  process.env.STRIPE_PRICE_BIZ_ANNUAL||"",
    limits:{ faqs:-1, services:-1, bookingsMonth:-1, messagesMonth:-1, teamMembers:-1 },
    features:{ calendar:true, whatsapp:true, telegram:true, aiResponses:true,
      googleCalSync:true, emailNotify:true, analyticsBasic:true, analyticsAdv:true,
      customBranding:true, apiAccess:true, prioritySupport:true },
  },
};

export const getPlan       = id => PLANS[id] || PLANS.free;
export const withinLimit   = (plan, key, current) => { const l=getPlan(plan).limits[key]; return l===-1||current<l; };
export const hasFeature    = (plan, key) => getPlan(plan).features[key]===true;
export const limitLabel    = (plan, key) => { const v=getPlan(plan).limits[key]; return v===-1?"Unlimited":v.toLocaleString(); };
