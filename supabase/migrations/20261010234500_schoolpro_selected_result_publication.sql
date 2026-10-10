CREATE OR REPLACE FUNCTION public.publish_schoolpro_selected_results(p_school uuid,p_term text,p_session text,p_students uuid[] DEFAULT NULL,p_all boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE n integer;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.schoolpro_module_allowed(p_school,'results'),false) OR NOT(public.schoolpro_member_can_manage(p_school) OR EXISTS(SELECT 1 FROM public.schoolpro_members m WHERE m.school_id=p_school AND m.user_id=auth.uid() AND m.role::text IN ('exam_officer','head_teacher','vice_principal'))) THEN RAISE EXCEPTION 'Result publication permission required'; END IF;
 IF nullif(trim(p_term),'') IS NULL OR nullif(trim(p_session),'') IS NULL THEN RAISE EXCEPTION 'Select an academic period'; END IF;
 IF p_all THEN
  IF coalesce(cardinality(p_students),0)>0 THEN RAISE EXCEPTION 'Choose one publication scope'; END IF;
 ELSE
  IF coalesce(cardinality(p_students),0)=0 THEN RAISE EXCEPTION 'Select students to publish'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_students) x(id) WHERE x.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.schoolpro_students s WHERE s.id=x.id AND s.school_id=p_school AND s.status='active')) THEN RAISE EXCEPTION 'Select enrolled students in this school'; END IF;
 END IF;
 UPDATE public.schoolpro_results r SET status='published',published_at=now(),locked=true
 WHERE r.school_id=p_school AND r.term=trim(p_term) AND r.session=trim(p_session) AND r.status='approved' AND NOT r.locked
 AND EXISTS(SELECT 1 FROM public.schoolpro_students s WHERE s.id=r.student_id AND s.school_id=p_school AND s.status='active' AND (p_all OR s.id=ANY(p_students)));
 GET DIAGNOSTICS n=ROW_COUNT;
 INSERT INTO public.audit_logs(actor_id,action,product,target_type,target_id,metadata) VALUES(auth.uid(),'Selected results published','schoolpro','school',p_school::text,jsonb_build_object('term',p_term,'session',p_session,'all_students',p_all,'students',p_students,'published',n));
 RETURN n;
END $function$;
REVOKE ALL ON FUNCTION public.publish_schoolpro_selected_results(uuid,text,text,uuid[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_schoolpro_selected_results(uuid,text,text,uuid[],boolean) TO authenticated;
