// Read complete CLI events from the accumulated log (chunks may split a line).
// Never report 100 here: only a verified output file can complete the job.
export function hyperframesProgress(log,previous=0){
 let result=previous,found=false;
 for(const match of String(log).matchAll(/@hf-progress\s+(\{[^\r\n]*\})/g)){
  try{
   const {pct}=JSON.parse(match[1]);
   if(typeof pct!=='number'||!Number.isFinite(pct)||pct<0||pct>100)continue;
   result=Math.max(result,Math.min(99,10+Math.floor(pct*.88)));found=true;
 }catch{/* A partial progress line is completed by the next chunk. */}
 }
 if(!found){
  const matches=[...String(log).matchAll(/(?:Rendered|Streaming frame|Capturing frames[^\n]*?)\s*(\d+)\s*\/\s*(\d+)/g)];
  if(matches.length){const [,done,total]=matches.at(-1);if(+total>0)result=Math.max(result,Math.min(99,10+Math.floor(+done/+total*88)));}
 }
 return result;
}
