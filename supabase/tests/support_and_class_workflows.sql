begin;
do $$
<<fixture>>
declare owner_id uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); school_id uuid:=gen_random_uuid(); class_id uuid:=gen_random_uuid(); other_class uuid:=gen_random_uuid(); student_id uuid:=gen_random_uuid(); subject_id uuid:=gen_random_uuid(); second_subject uuid:=gen_random_uuid(); scheme_id uuid:=gen_random_uuid(); fee_id uuid; invoice_id uuid; result jsonb; ticket_id uuid:=gen_random_uuid(); denied boolean;
begin
 insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) select v,'authenticated','authenticated','support-fixture-'||v||'@example.invalid','{}','{"first_name":"Support","middle_name":"Test","last_name":"Fixture"}',now(),now() from unnest(array[owner_id,outsider])v;
 insert into public.schoolpro_schools(id,owner_id,name,code)values(school_id,owner_id,'Class workflow fixture','FIX-'||school_id);
 insert into public.schoolpro_subscriptions(school_id,tier,billing_cycle,status,renews_at)values(school_id,'enterprise','termly','active',now()+interval '90 days');update public.schoolpro_schools set status='active' where id=school_id;
 insert into public.schoolpro_classes(id,school_id,name,level)values(class_id,school_id,'SS 1','senior_secondary'),(other_class,school_id,'JSS 1','junior_secondary');
 insert into public.schoolpro_students(id,school_id,admission_number,first_name,last_name,class_id,class_name)values(student_id,school_id,'FIX-1','One','Fixture',class_id,'SS 1');
 insert into public.schoolpro_subjects(id,school_id,name,code,class_name)values(subject_id,school_id,'Mathematics','FIX-MTH','SS 1'),(second_subject,school_id,'English','FIX-ENG','SS 1');
 insert into public.schoolpro_assessment_schemes(id,school_id,name,school_level,components) values(scheme_id,school_id,'Fixture assessment','senior_secondary','[{"key":"ca","label":"CA","maxScore":40},{"key":"exam","label":"Exam","maxScore":60}]');
 insert into public.schoolpro_results(school_id,student_id,subject_id,term,session,assessment_scheme_id,assessment_scores,status,locked)values(school_id,student_id,subject_id,'First Term','2026/2027',scheme_id,'{"ca":30,"exam":50}','published',true),(school_id,student_id,second_subject,'First Term','2026/2027',scheme_id,'{"ca":25,"exam":45}','published',true);
 perform set_config('request.jwt.claim.sub',owner_id::text,true);execute 'set local role authenticated';
 result:=public.schoolpro_class_broadsheet(school_id,class_id,'First Term','2026/2027');
 if jsonb_array_length(result->'rows')<>1 or jsonb_array_length(result->'subjects')<>2 or (result->'rows'->0->>'total')::numeric<>150 or (result->'rows'->0->>'average')::numeric<>75 or (result->'rows'->0->'scores'->>subject_id::text)::numeric<>80 then raise exception 'Subject matrix or summary incorrect: %',result;end if;
 result:=public.create_schoolpro_fee_bundle(school_id,'Term charges',array['SS 1'],'First Term','2026/2027',null,'[{"label":"Tuition","amount":100,"category":"fee"},{"label":"Books","amount":20,"category":"books"}]');fee_id:=(result->'structures'->>0)::uuid;
 select id into invoice_id from public.schoolpro_invoices where fee_structure_id=fee_id;
 if (select amount_due from public.schoolpro_invoices where id=invoice_id)<>120 or (select count(*) from public.schoolpro_fee_items where fee_structure_id=fee_id)<>2 then raise exception 'Fee bundle not atomic or invoice total incorrect';end if;
 perform public.edit_schoolpro_fee_invoice(invoice_id,'Revised charges',125,null,'Testing');
 if (select amount_due from public.schoolpro_invoices where id=invoice_id)<>125 then raise exception 'Invoice editor failed';end if;
 denied:=false;begin perform public.edit_schoolpro_fee_invoice(invoice_id,'Bad',-1,null,null);exception when others then denied:=true;end;if not denied then raise exception 'Negative invoice amount accepted';end if;
 insert into public.support_tickets(id,user_id,product,subject,message)values(ticket_id,owner_id,'datasub','Fixture support','Fixture support message');
 if not exists(select 1 from public.ihlink_email_queue where source='support_tickets' and source_id=ticket_id::text and recipient_email='hassanisahassan12@gmail.com') then raise exception 'Support email missing';end if;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 denied:=false;begin perform public.schoolpro_class_broadsheet(school_id,class_id,'First Term','2026/2027');exception when others then denied:=true;end;if not denied then raise exception 'Outsider read broadsheet';end if;
 denied:=false;begin perform public.edit_schoolpro_fee_invoice(invoice_id,'Other',100,null,null);exception when others then denied:=true;end;if not denied then raise exception 'Outsider edited invoice';end if;
 execute 'reset role';
 insert into public.host_support_tickets(user_id,category,subject,message)values(owner_id,'hosting','Fixture hosting','Fixture support message');
 insert into public.engineering_support_tickets(user_id,category,subject,message)values(owner_id,'other','Fixture engineering','Fixture support message');
 insert into public.print_support_tickets(user_id,subject,message)values(owner_id,'Fixture print','Fixture support message');
 insert into public.business_support_tickets(user_id,unit_code,subject,message)values(owner_id,'academy','Fixture academy','Fixture support message');
 if (select count(*) from public.ihlink_email_queue where user_id=owner_id and source in ('support_tickets','host_support_tickets','engineering_support_tickets','print_support_tickets','business_support_tickets'))<>5 then raise exception 'Some platforms did not queue support';end if;
end $$;
rollback;
