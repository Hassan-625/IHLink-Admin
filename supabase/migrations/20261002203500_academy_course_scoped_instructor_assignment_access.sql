drop policy if exists "academy instructors read assigned assignments" on public.academy_assignments;
create policy "academy instructors read assigned assignments" on public.academy_assignments for select to authenticated using (
 exists(select 1 from public.academy_instructors i join public.academy_cohort_instructors ci on ci.instructor_id=i.id join public.academy_cohorts c on c.id=ci.cohort_id where i.user_id=auth.uid() and i.is_active and c.course_id=academy_assignments.course_id and (academy_assignments.cohort_id is null or ci.cohort_id=academy_assignments.cohort_id))
);
drop policy if exists "academy instructors read assigned submissions" on public.academy_assignment_submissions;
create policy "academy instructors read assigned submissions" on public.academy_assignment_submissions for select to authenticated using (
 exists(select 1 from public.academy_assignments a join public.academy_instructors i on i.user_id=auth.uid() and i.is_active join public.academy_cohort_instructors ci on ci.instructor_id=i.id join public.academy_cohorts c on c.id=ci.cohort_id where a.id=academy_assignment_submissions.assignment_id and c.course_id=a.course_id and (a.cohort_id is null or ci.cohort_id=a.cohort_id))
);
create or replace function public.grade_academy_assignment_submission(p_submission_id uuid,p_score numeric,p_feedback text default null) returns void language plpgsql security definer set search_path='' as $$
declare s public.academy_assignment_submissions%rowtype; a public.academy_assignments%rowtype; allowed boolean:=false;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into s from public.academy_assignment_submissions where id=p_submission_id for update;
 if s.id is null then raise exception 'Submission not found'; end if;
 select * into a from public.academy_assignments where id=s.assignment_id;
 if a.id is null then raise exception 'Assignment not found'; end if;
 if private.is_admin(array['super_admin'::public.user_role]) then allowed:=true;
 else select exists(select 1 from public.academy_instructors i join public.academy_cohort_instructors ci on ci.instructor_id=i.id join public.academy_cohorts c on c.id=ci.cohort_id where i.user_id=auth.uid() and i.is_active and c.course_id=a.course_id and (a.cohort_id is null or ci.cohort_id=a.cohort_id)) into allowed;
 end if;
 if not allowed then raise exception 'Instructor access required'; end if;
 if p_score<0 or p_score>a.max_score then raise exception 'Score must be between 0 and assignment maximum'; end if;
 update public.academy_assignment_submissions set score=p_score,feedback=nullif(trim(p_feedback),''),status='graded',graded_at=now(),graded_by=auth.uid(),updated_at=now() where id=s.id;
end $$;
revoke all on function public.grade_academy_assignment_submission(uuid,numeric,text) from public,anon;
grant execute on function public.grade_academy_assignment_submission(uuid,numeric,text) to authenticated;