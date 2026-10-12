/** School catalogues are shared; activity records belong to an academic session. */
export const SCHOOL_SESSION_TABLES=new Set(['schoolpro_library_loans','schoolpro_student_transport','schoolpro_hostel_allocations','schoolpro_payroll_records','schoolpro_health_records','schoolpro_discipline_records','schoolpro_calendar_events','schoolpro_leave_requests','schoolpro_lesson_notes','schoolpro_promotions','schoolpro_academic_documents','schoolpro_assignments','schoolpro_announcements','schoolpro_timetable_entries','schoolpro_attendance','schoolpro_results','schoolpro_invoices']);
export function scopeSchoolSession(query:any,table:string,session:string){return SCHOOL_SESSION_TABLES.has(table)?query.eq('session',session||''):query;}

