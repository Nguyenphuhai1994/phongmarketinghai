"use strict";
(function(root){
  const DAY=86400000,RETURNED=new Set(["review","completed","handed_off"]);
  function dateVN(value=Date.now()){return new Date(Number(value)+7*3600000).toISOString().slice(0,10);}
  function validDate(value){if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const time=Date.parse(value+"T00:00:00Z");return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;}
  const shift=(date,days)=>new Date(Date.parse(date+"T00:00:00Z")+days*DAY).toISOString().slice(0,10);
  function periodRange(period,now=Date.now()){
    const today=dateVN(now),first=today.slice(0,8)+"01",monday=shift(today,-((new Date(today+"T12:00:00Z").getUTCDay()+6)%7));
    switch(period){
      case"today":return {from:today,to:today};case"yesterday":return {from:shift(today,-1),to:shift(today,-1)};
      case"7days":return {from:shift(today,-6),to:today};case"30days":return {from:shift(today,-29),to:today};
      case"week":return {from:monday,to:today};case"lastweek":return {from:shift(monday,-7),to:shift(monday,-1)};
      case"month":return {from:first,to:today};case"lastmonth":{const end=shift(first,-1);return {from:end.slice(0,8)+"01",to:end};}
      default:return {from:"",to:""};
    }
  }
  function instant(value){if(value==null||value==="")return NaN;return typeof value==="number"?value:Date.parse(value);}
  function filterJobs(jobs,{status="all",from="",to="",dateField="createdAt",employeeId=""}={}){
    if(!validDate(from)||!validDate(to)||from&&to&&from>to)throw new Error("Khoảng ngày không hợp lệ. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
    if(!["createdAt","startAt","finishedAt","dueAt","approvedAt"].includes(dateField))throw new Error("Loại ngày không hợp lệ");
    const lower=from?Date.parse(from+"T00:00:00+07:00"):-Infinity,upper=to?Date.parse(to+"T00:00:00+07:00")+DAY:Infinity;
    return jobs.filter(j=>{
      if(status==="trash"?!j.deletedAt:!!j.deletedAt)return false;
      if(status!=="all"&&status!=="trash"&&!(status==="pending"?["queued","scheduled"].includes(j.status):status==="attention"?["failed","interrupted","blocked","rejected"].includes(j.status)||j.overdue:j.status===status))return false;
      if(employeeId&&j.employeeId!==employeeId)return false;
      if(from||to){const time=instant(j[dateField]);if(!Number.isFinite(time)||time<lower||time>=upper)return false;}
      return true;
    }).sort((a,b)=>(instant(b[dateField])||0)-(instant(a[dateField])||0));
  }
  function affectedJobs(jobs,ids){
    const children=new Map();for(const j of jobs){if(!children.has(j.parentJobId))children.set(j.parentJobId,[]);children.get(j.parentJobId).push(j.id);}
    const found=new Set(ids),queue=[...ids];for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i])||[])if(!found.has(id)){found.add(id);queue.push(id);}
    return jobs.filter(j=>found.has(j.id)&&!j.deletedAt);
  }
  function reportJobs(jobs,employees=[]){
    const totals={total:0,returned:0,review:0,approved:0,attention:0,onTime:0,late:0,timed:0},byEmployee=new Map();
    const count=(s,j)=>{s.total++;if(RETURNED.has(j.status))s.returned++;if(j.status==="review")s.review++;if(j.status==="completed")s.approved++;
      if(["failed","interrupted","blocked","rejected"].includes(j.status)||(j.overdue&&!RETURNED.has(j.status)&&j.status!=="cancelled"))s.attention++;
      const end=instant(j.finishedAt),due=instant(j.dueAt);if(RETURNED.has(j.status)&&Number.isFinite(end)&&Number.isFinite(due)){s.timed++;s[end<=due?"onTime":"late"]++;}};
    for(const j of jobs){if(j.deletedAt)continue;count(totals,j);if(!byEmployee.has(j.employeeId))byEmployee.set(j.employeeId,{...totals,total:0,returned:0,review:0,approved:0,attention:0,onTime:0,late:0,timed:0,id:j.employeeId,name:employees.find(e=>e.id===j.employeeId)?.name||"Nhân viên không còn trong đội"});count(byEmployee.get(j.employeeId),j);}
    return {totals,employees:[...byEmployee.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,"vi"))};
  }
  const api={dateVN,periodRange,filterJobs,affectedJobs,reportJobs};if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.OfficeJobs=api;
})(typeof window!=="undefined"?window:globalThis);
