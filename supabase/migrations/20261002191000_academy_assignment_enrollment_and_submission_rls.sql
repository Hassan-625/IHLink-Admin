drop policy if exists "academy published assignments authenticated read" on public.academy_assignments;
create policy "academy enrolled learners read published assignments" on public.academy_assignments for select to authenticated using (
 is_published and exists(select 1 from public.academy_enrollments e where e.course_id=academy_assignments.course_id and e.user_id=auth.uid() and e.status in ('active','completed'))
);
create policy "academy instructors read assigned assignments" on public.academy_assignments for select to authenticated using (
 exists(select 1 from public.academy_instructors i join public.academy_cohort_instructors ci on ci.instructor_id=i.id where i.user_id=auth.uid() and i.is_active and (academy_assignments.cohort_id is null or ci.cohort_id=academy_assignments.cohort_id))
);
create policy "academy learners read own submissions" on public.academy_assignment_submissions for select to authenticated using (
 exists(select 1 from public.academy_enrollments e where e.id=academy_assignment_submissions.enrollment_id and e.user_id=auth.uid())
);
create policy "academy learners create own submissions" on public.academy_assignment_submissions for insert to authenticated with check (
 status='submitted' and score is null and feedback is null and graded_at is null and graded_by is null and
 exists(select 1 from public.academy_enrollments e join public.academy_assignments a on a.id=academy_assignment_submissions.assignment_id where e.id=academy_assignment_submissions.enrollment_id and e.user_id=auth.uid() and e.status='active' and a.course_id=e.course_id and a.is_published)
);
create policy "academy instructors read assigned submissions" on public.academy_assignment_submissions for select to authenticated using (
 exists(select 1 from public.academy_assignments a join public.academy_instructors i on i.user_id=auth.uid() and i.is_active left join public.academy_cohort_instructors ci on ci.instructor_id=i.id where a.id=academy_assignment_submissions.assignment_id and (a.cohort_id is null or ci.cohort_id=a.cohort_id))
);
