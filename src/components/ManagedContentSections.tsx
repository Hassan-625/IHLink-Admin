import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";

export type ManagedPageKey = "corporate"|"datasub"|"schoolpro"|"consult"|"host"|"engineering"|"business_centre"|"print"|"fabrication"|"compute"|"academy"|"digital_business";
type Block={id:string;section_key:string;eyebrow:string|null;title:string;body:string|null;image_url:string|null;cta_label:string|null;cta_link:string|null;layout:"split"|"centered"|"cards"|"banner";theme:"light"|"navy"|"blue"|"emerald"|"purple"|"orange";sort_order:number};
const themes={light:"bg-white text-ink",navy:"bg-navy-900 text-white",blue:"bg-gradient-to-br from-royal-700 to-sky-500 text-white",emerald:"bg-gradient-to-br from-emerald-600 to-cyan-500 text-white",purple:"bg-gradient-to-br from-purple-700 to-indigo-600 text-white",orange:"bg-gradient-to-br from-orange-500 to-pink-600 text-white"};

export function ManagedContentSections({pageKey}:{pageKey:ManagedPageKey}){
 const [blocks,setBlocks]=useState<Block[]>([]);
 useEffect(()=>{let active=true;async function load(){if(!supabase)return;const {data}=await supabase.from("site_content_blocks").select("id,section_key,eyebrow,title,body,image_url,cta_label,cta_link,layout,theme,sort_order").eq("page_key",pageKey).eq("is_visible",true).neq("section_key","hero").order("sort_order");if(active)setBlocks((data||[]) as Block[]);}void load();return()=>{active=false};},[pageKey]);
 if(!blocks.length)return null;
 return <div data-managed-content={pageKey}>{blocks.map(block=>{const centered=block.layout==="centered"||block.layout==="banner";const content=<div className={centered?"mx-auto max-w-3xl text-center":"max-w-2xl"}>{block.eyebrow&&<p className="mb-3 text-xs font-extrabold uppercase tracking-[.2em] opacity-80">{block.eyebrow}</p>}<h2 className="text-3xl font-extrabold lg:text-5xl">{block.title}</h2>{block.body&&<p className="mt-5 text-base leading-7 opacity-85 lg:text-lg">{block.body}</p>}{block.cta_label&&block.cta_link&&<div className="mt-7">{block.cta_link.startsWith("/")?<Link to={block.cta_link}><Button rightIcon={<ArrowRight className="h-4 w-4"/>}>{block.cta_label}</Button></Link>:<a href={block.cta_link} target="_blank" rel="noreferrer"><Button rightIcon={<ArrowRight className="h-4 w-4"/>}>{block.cta_label}</Button></a>}</div>}</div>;return <section key={block.id} id={block.section_key} className="px-6 py-16 lg:px-10"><div className={`mx-auto max-w-[1280px] overflow-hidden rounded-3xl ${themes[block.theme]} ${block.layout==="banner"?"p-10 lg:p-16":"p-8 lg:p-12"}`}><div className={block.layout==="split"&&block.image_url?"grid items-center gap-10 lg:grid-cols-2":""}>{content}{block.image_url&&<img src={block.image_url} alt="" className={`w-full rounded-2xl object-cover ${block.layout==="split"?"h-72":"mt-8 h-80"}`}/>}</div></div></section>})}</div>;
}
