export type SchoolClass={id:string;name:string;arm?:string|null;level?:string|null};
export function schoolSection(level:string|undefined|null,name=''){
 const value=(level||'').toLowerCase().replaceAll(' ','_');
 if(['nursery','pre_primary','pre-primary','kindergarten'].includes(value)||/nursery|pre.?primary|kindergarten/i.test(name))return 'Nursery';
 if(['junior_secondary','jss','junior'].includes(value)||/^(jss|js|junior)/i.test(name))return 'Junior Secondary';
 if(['senior_secondary','sss','ss','senior'].includes(value)||/^(sss|ss|senior)/i.test(name))return 'Senior Secondary';
 if(value==='primary'||/primary|basic/i.test(name))return 'Primary';
 return value?value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):'Other classes';
}

export const SCHOOL_SECTIONS=['Nursery','Primary','Junior Secondary','Senior Secondary'];
export function studentClass<T extends {class_id?:string|null;class_name?:string|null}>(student:T,classes:SchoolClass[]){return classes.find(c=>c.id===student.class_id)||classes.find(c=>[c.name,c.arm].filter(Boolean).join(' ').trim().toLowerCase()===(student.class_name||'').trim().toLowerCase());}

export function filterSchoolStudents<T extends {id:string;class_id?:string|null;class_name?:string|null;class_level?:string|null}>(students:T[],classes:SchoolClass[],selection:{section:string;className:string;armId:string;requireClass?:boolean}){
 const {section,className,armId,requireClass=false}=selection;
 const needsArm=classes.some(c=>schoolSection(c.level,c.name)===section&&c.name===className&&c.arm);
 if(requireClass&&(!section||!className||(needsArm&&!armId)))return [];
 return students.filter(s=>{const c=studentClass(s,classes);return (!section||schoolSection(c?.level||s.class_level,c?.name||s.class_name||'')===section)&&(!className||(c?.name||s.class_name)===className)&&(!armId||(c?.id||s.class_name)===armId)});
}

