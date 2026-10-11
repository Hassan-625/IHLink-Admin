/** Fetch each authorized page, rather than silently truncating the roster. */
export async function fetchSchoolRows(query:any,pageSize=500):Promise<{data:any[];error:any}>{
 const rows:any[]=[];for(let start=0;;start+=pageSize){const page=await query.range(start,start+pageSize-1);if(page.error)return {data:[],error:page.error};rows.push(...(page.data||[]));if((page.data||[]).length<pageSize)return {data:rows,error:null};}
}
