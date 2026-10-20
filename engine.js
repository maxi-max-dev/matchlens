/* Deterministic synthetic event stream. Metrics describe events, not tracking-derived possession. */
(function(root){
const START=55*60, END=70*60;
const names={blue:['林恩','埃文','里奥','诺亚','凯'],amber:['奥斯','米洛','阿什','莱恩','艾利']};
function rand(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function makeMatch(scenario='turning'){
 const r=rand(scenario==='turning'?421:scenario==='counter'?731:111), events=[];
 for(let t=START,i=0;t<=END;t+=10,i++){
  let team=i%2?'amber':'blue'; let x=25+r()*45,y=12+r()*76,type=i%13===0?'shot':'pass';
  if(scenario==='turning'&&t>=61*60&&t<66*60){ team=i%5===0?'amber':'blue';if(team==='blue'){y=75+r()*16;x=t>=64*60?70+r()*20:40+r()*36;}}
  if(scenario==='quiet'){x=30+(i%5)*9;y=20+(i%3)*30;type='pass';}
  if(type==='shot')x=Math.max(73,x);
  let endX=Math.min(96,x+8+r()*13),endY=Math.min(96,Math.max(4,y+(r()-.5)*18));
  const counterStart=scenario==='counter'?59*60:67*60;
  if(scenario!=='quiet'&&t>=counterStart&&t<=counterStart+20){team='blue';let k=(t-counterStart)/10;type=['regain','pass','shot'][k];x=[32,49,83][k];y=[55,62,53][k];endX=[34,81,99][k];endY=[55,53,50][k];}
  events.push({id:scenario+'-'+i,t,team,type,x:+x.toFixed(1),y:+y.toFixed(1),endX:+endX.toFixed(1),endY:+endY.toFixed(1),player:names[team][i%5],success:true});
 }
 return events;
}
const visible=(events,t)=>events.filter(e=>e.t<=t);
const windowEvents=(events,t,seconds=120)=>events.filter(e=>e.t>t-seconds&&e.t<=t);
function stats(events,t,team='blue'){
 const recent=windowEvents(events,t).filter(e=>e.team===team),prior=events.filter(e=>e.t>t-240&&e.t<=t-120&&e.team===team);
 const count=(a,p)=>a.filter(p).length;
 const right=a=>count(a,e=>e.y>=66),third=a=>count(a,e=>e.x>=66.7);
 return {recent,prior,n:recent.length,bn:prior.length,right:right(recent),beforeRight:right(prior),third:third(recent),beforeThird:third(prior),shots:count(recent,e=>e.type==='shot')};
}
function detect(events,t){
 const s=stats(events,t),out=[];
 if(s.n>=6&&s.bn>=4&&s.right/s.n>=.65&&s.right/s.n-s.beforeRight/s.bn>=.30){out.push({kind:'flank',t,ids:s.recent.map(e=>e.id),baseline:s.prior.map(e=>e.id),values:s});}
 if(s.n>=6&&s.third>=5&&s.third>=s.beforeThird+4){out.push({kind:'territory',t,ids:s.recent.filter(e=>e.x>=66.7).map(e=>e.id),baseline:s.prior.filter(e=>e.x>=66.7).map(e=>e.id),values:s});}
 const recent=windowEvents(events,t,40);
 for(const shot of recent.filter(e=>e.type==='shot')){
  const regain=events.find(e=>e.type==='regain'&&e.team===shot.team&&e.t<shot.t&&shot.t-e.t<=25);
  if(regain){const chain=events.filter(e=>e.t>=regain.t&&e.t<=shot.t);if(chain.every(e=>e.team===shot.team))out.push({kind:'counter',t:shot.t,ids:chain.map(e=>e.id),baseline:[],values:{duration:shot.t-regain.t}});}
 }
 return out;
}
function insights(events,now){
 const result=[],last={};
 for(let t=START+30;t<=now;t+=10){for(const d of detect(events,t)){if(last[d.kind]===undefined||d.t-last[d.kind]>=240){result.push({...d,key:d.kind+'-'+d.t});last[d.kind]=d.t;}}}
 return result.sort((a,b)=>a.t-b.t);
}
function clock(t){return `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`}
const API={START,END,makeMatch,visible,windowEvents,stats,detect,insights,clock};
if(typeof module!=='undefined')module.exports=API;else root.MatchEngine=API;
})(typeof window!=='undefined'?window:globalThis);
