import { Mail, MessageCircle, Phone } from "lucide-react";
import { IHLinkContact } from "@/lib/contact";

export function QuickContact({className=""}:{className?:string}){
 const actions=[
  {label:"Call IHLink",value:IHLinkContact.phoneDisplay,href:IHLinkContact.phoneHref,icon:Phone,color:"bg-royal-50 text-royal-700"},
  {label:"WhatsApp",value:"Chat with our team",href:IHLinkContact.whatsappHref,icon:MessageCircle,color:"bg-emerald-50 text-emerald-700",external:true},
  {label:"Send email",value:IHLinkContact.email,href:IHLinkContact.emailHref,icon:Mail,color:"bg-orange-50 text-orange-700"},
 ];
 return <div className={`grid gap-3 md:grid-cols-3 ${className}`}>{actions.map(a=><a key={a.label} href={a.href} target={a.external?"_blank":undefined} rel={a.external?"noreferrer":undefined} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${a.color}`}><a.icon className="h-5 w-5"/></span><span className="min-w-0"><span className="block text-sm font-bold text-ink">{a.label}</span><span className="block truncate text-xs text-muted">{a.value}</span></span></a>)}</div>;
}
