create table public.ihlink_email_queue(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 product text not null,recipient_email text not null,recipient_name text,subject text not null,message text not null,
 action_url text,source text not null,source_id text not null,school_id uuid references public.schoolpro_schools(id),
 status text not null default 'queued' check(status in ('queued','processing','accepted','failed','cancelled')),
 attempts integer not null default 0,next_attempt_at timestamptz not null default now(),locked_at timestamptz,
 provider_message_id text,accepted_at timestamptz,last_error text,created_at timestamptz not null default now(),unique(source,source_id));
alter table public.ihlink_email_queue enable row level security;
revoke all on public.ihlink_email_queue from public,anon,authenticated;
grant select on public.ihlink_email_queue to authenticated;
grant all on public.ihlink_email_queue to service_role;
create policy "Email queue recipient or platform administrator" on public.ihlink_email_queue for select to authenticated using(user_id=(select auth.uid()) or private.has_product_access(product,'view'));
create index ihlink_email_ready on public.ihlink_email_queue(next_attempt_at) where status in ('queued','processing');

create or replace function private.queue_ihlink_notification_email() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.profiles%rowtype; j jsonb:=to_jsonb(new); product text; title text; message text; href text; scheduled timestamptz:=now();
begin
 if tg_table_name='datasub_transactions' then
  if new.status not in ('success','failed') or(tg_op='UPDATE' and new.status=old.status) then return new;end if;
  product:='datasub';title:=case when new.status='success' then 'Your purchase was successful' else 'Your purchase was not completed' end;
  message:='Reference: '||new.reference||E'\nAmount: NGN '||new.amount::text||E'\nOpen your transaction history for the receipt and current wallet refund details.';
  href:='https://ihlink-datasub.onrender.com/datasub/transactions';
 elsif tg_table_name='notification_deliveries' then
  if new.channel<>'email' or new.status<>'queued' then return new;end if;
  select c.product,c.title,c.message,c.action_url,coalesce(c.scheduled_for,now()) into product,title,message,href,scheduled from public.notification_campaigns c where c.id=new.campaign_id;
 else
  product:=case tg_table_name when 'consult_notifications' then 'consult' when 'host_notifications' then 'host' when 'engineering_notifications' then 'engineering' when 'print_notifications' then 'print' else coalesce(j->>'unit_code','business_centre') end;
  title:=j->>'title';message:=j->>'body';
 end if;
 select * into p from public.profiles where id=(j->>'user_id')::uuid and status='active';
 if p.id is null or nullif(p.email,'') is null or title is null then return new;end if;
 insert into public.ihlink_email_queue(user_id,product,recipient_email,recipient_name,subject,message,action_url,source,source_id,next_attempt_at)
 values(p.id,product,p.email,concat_ws(' ',p.first_name,p.last_name),title,coalesce(message,title),href,tg_table_name,new.id::text,scheduled) on conflict(source,source_id) do nothing;
 return new;
end $$;
create trigger ihlink_campaign_email after insert on public.notification_deliveries for each row execute function private.queue_ihlink_notification_email();
create trigger ihlink_purchase_email after insert or update of status on public.datasub_transactions for each row execute function private.queue_ihlink_notification_email();
do $$declare t text;begin foreach t in array array['consult_notifications','host_notifications','engineering_notifications','print_notifications','business_notifications'] loop execute format('create trigger ihlink_transactional_email after insert on public.%I for each row execute function private.queue_ihlink_notification_email()',t);end loop;end$$;

create or replace function public.claim_ihlink_emails(p_school_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 with picked as(select q.id from public.ihlink_email_queue q join public.profiles p on p.id=q.user_id and p.status='active' where p_school_id is null and q.attempts<5 and ((q.status='queued' and q.next_attempt_at<=now()) or(q.status='processing' and q.locked_at<now()-interval '3 minutes')) and (q.source<>'notification_deliveries' or exists(select 1 from public.notification_deliveries d join public.notification_campaigns c on c.id=d.campaign_id where d.id::text=q.source_id and d.status='queued' and c.status='sent')) order by q.created_at limit 20 for update of q skip locked), claimed as(update public.ihlink_email_queue q set status='processing',locked_at=now(),attempts=attempts+1 from picked where q.id=picked.id returning q.*)
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('queue','ihlink')),'[]'::jsonb) into result from claimed c;
 with picked as(select q.id from public.schoolpro_email_queue q where (p_school_id is null or q.school_id=p_school_id) and q.attempts<5 and ((q.status='pending' and coalesce(q.scheduled_at,now())<=now()) or(q.status='processing' and q.last_attempt_at<now()-interval '3 minutes')) order by q.created_at limit 20 for update skip locked),claimed as(update public.schoolpro_email_queue q set status='processing',last_attempt_at=now(),attempts=attempts+1 from picked where q.id=picked.id returning q.*)
 select result||coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('queue','schoolpro','product','schoolpro','message',coalesce(c.payload->>'message',c.subject),'action_url',c.payload->>'action_url')),'[]'::jsonb) into result from claimed c;
 return result;
end $$;
revoke all on function public.claim_ihlink_emails(uuid) from public,anon,authenticated;
grant execute on function public.claim_ihlink_emails(uuid) to service_role;
create or replace function public.retry_ihlink_email(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p text;
begin
 select product into p from public.ihlink_email_queue where id=p_id;
 if auth.uid() is null or not private.is_active_account() or not private.has_product_access(p,'approve') then raise exception 'Email management permission required';end if;
 update public.ihlink_email_queue set status='queued',attempts=0,next_attempt_at=now(),locked_at=null,last_error=null where id=p_id and status='failed';
 if not found then raise exception 'Only a failed email can be retried';end if;
end $$;
revoke all on function public.retry_ihlink_email(uuid) from public,anon;
grant execute on function public.retry_ihlink_email(uuid) to authenticated;
-- Provider settings are deliberately not stored in client-visible tables.
select cron.schedule('ihlink-email-delivery-2m','*/2 * * * *',$job$select net.http_post(url:='https://lnqsroyiybutkfngbyge.supabase.co/functions/v1/ihlink-email-worker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='ihlink_delivery_worker_token')),body:='{}'::jsonb);$job$);
