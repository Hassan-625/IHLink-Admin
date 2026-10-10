CREATE OR REPLACE FUNCTION public.apply_schoolpro_promotion(p_promotion uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.schoolpro_promotions;c public.schoolpro_classes;s public.schoolpro_students;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into p from public.schoolpro_promotions where id=p_promotion for update;
 if p.id is null then raise exception 'Progression not found';end if;
 if not private.schoolpro_module_allowed(p.school_id,'promotions') then raise exception 'Module permission denied';end if;
 if not(private.is_admin(array['super_admin'::public.user_role]) or private.has_school_access(p.school_id,array['proprietor'::public.school_member_role,'administrator'::public.school_member_role,'head_teacher'::public.school_member_role,'vice_principal'::public.school_member_role,'registrar'::public.school_member_role])) then raise exception 'Not authorized';end if;
 if p.status='applied' then return;end if;
 if p.status<>'pending' then raise exception 'Progression is not pending';end if;
 select * into s from public.schoolpro_students where id=p.student_id and school_id=p.school_id for update;
 if s.id is null then raise exception 'Student not found';end if;
 if s.status<>'active' then raise exception 'Only active students can receive progression decisions';end if;
 if s.class_id is distinct from p.from_class_id then raise exception 'Student class changed after progression decision; create a new decision';end if;
 if p.decision in('promoted','repeated') then
  select * into c from public.schoolpro_classes where id=p.to_class_id and school_id=p.school_id;
  if c.id is null then raise exception 'Destination class invalid';end if;
  update public.schoolpro_students set class_id=c.id,class_name=concat_ws(' ',c.name,nullif(c.arm,'')),status='active' where id=s.id;
 elsif p.decision='graduated' then
  update public.schoolpro_students set status='graduated',class_id=null,class_name=null where id=s.id;
 end if;
 update public.schoolpro_promotions set status='applied',applied_by=auth.uid(),applied_at=now() where id=p.id;
end $function$

CREATE OR REPLACE FUNCTION public.create_schoolpro_progression(p_student uuid, p_session text, p_decision text, p_to_class uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.schoolpro_students;c public.schoolpro_classes;v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into s from public.schoolpro_students where id=p_student for share;
 if s.id is null then raise exception 'Student not found';end if;
 if not private.schoolpro_module_allowed(s.school_id,'promotions') then raise exception 'Module permission denied';end if;
 if not(private.is_admin(array['super_admin'::public.user_role]) or private.has_school_access(s.school_id,array['proprietor'::public.school_member_role,'administrator'::public.school_member_role,'head_teacher'::public.school_member_role,'vice_principal'::public.school_member_role,'registrar'::public.school_member_role])) then raise exception 'Not authorized';end if;
 if trim(coalesce(p_session,''))='' or p_decision not in('promoted','repeated','graduated') then raise exception 'Invalid progression decision';end if;
 if s.class_id is null then raise exception 'Student must be assigned to a class';end if;
 if p_decision='promoted' then
  if p_to_class is null then raise exception 'Destination class required';end if;
  select * into c from public.schoolpro_classes where id=p_to_class and school_id=s.school_id;
  if c.id is null or c.id=s.class_id then raise exception 'Invalid destination class';end if;
 elsif p_decision='repeated' then p_to_class:=s.class_id;
 else p_to_class:=null;
 end if;
 insert into public.schoolpro_promotions(school_id,student_id,from_class_id,to_class_id,from_class,to_class,session,status,decision,decided_by,reason)
 select s.school_id,s.id,s.class_id,p_to_class,concat_ws(' ',fc.name,nullif(fc.arm,'')),case when p_to_class is null then null else (select concat_ws(' ',name,nullif(arm,'')) from public.schoolpro_classes where id=p_to_class) end,trim(p_session),'pending',p_decision,auth.uid(),nullif(trim(coalesce(p_reason,'')),'') from public.schoolpro_classes fc where fc.id=s.class_id
 returning id into v_id;
 return v_id;
end $function$;