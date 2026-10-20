const E=MatchEngine,$=s=>document.querySelector(s);
let scenario='turning',events=E.makeMatch(scenario),now=63*60+30,mode='casual',playing=false,speed=30,focused=null;
let currentInsights=[],lastBucket=-1;
const titles={flank:'蓝队的进攻，开始向右倾斜',territory:'蓝队在前场的活动变多了',counter:'从夺回球权到射门，只用了 20 秒'};
const shortTitles={flank:'进攻重心移向右路',territory:'前场事件明显增加',counter:'夺回球权后快速射门'};
const kindNames={flank:'进攻方向变化',territory:'前场活动变化',counter:'快速反击'};
const eventNames={pass:'传球',shot:'射门',regain:'夺回球权'};
function desc(d,detail=false){let s=d.values;if(d.kind==='counter')return detail?`本队连续 ${d.ids.length} 条事件串起了夺回球权、传球和射门，间隔 ${s.duration} 秒。期间未记录对方触球。`:`北岸联刚拿回球，便迅速把进攻推进到门前。${s.duration} 秒内完成射门，对手没有在这段事件链中夺回球权。`;if(d.kind==='flank')return detail?`右侧起点事件占比 ${pct(s.right,s.n)}（${s.right}/${s.n}），前一个 2 分钟为 ${pct(s.beforeRight,s.bn)}（${s.beforeRight}/${s.bn}）。比较窗口互不重叠。`:`截至 ${E.clock(d.t)} 的两分钟里，北岸联 ${s.n} 次事件中有 ${s.right} 次发生在右侧，明显多于此前。接下来看球时，可以留意这一侧的推进。`;return detail?`进攻三区内事件数 ${s.beforeThird} → ${s.third}；均以事件起点 x ≥ 66.7 为准。当前窗口共 ${s.n} 条本队事件。`:`截至 ${E.clock(d.t)} 的两分钟里，北岸联在前场记录了 ${s.third} 次事件，此前两分钟只有 ${s.beforeThird} 次。球更多地出现在对方门前区域。`;}
function pct(a,b){return b?Math.round(a/b*100)+'%':'—'}
function setPlaying(v){playing=v;$('#play').textContent=v?'Ⅱ':'▶';$('#play').setAttribute('aria-label',v?'暂停比赛':'播放比赛');$('#play-status').textContent=v?'正在回放 · '+speed+' 倍速':now>=E.END?'片段结束 · 可以回看任意时刻':'已暂停 · 拖动时间轴探索';}
function seek(t){now=Math.max(E.START,Math.min(E.END,t));focused=null;lastBucket=-1;render();setPlaying(now===E.END?false:playing);}
function render(){
 $('#match-clock').textContent=E.clock(now);$('#control-clock').textContent=E.clock(now);$('#seek').value=Math.floor(now);$('#seek').setAttribute('aria-valuetext',E.clock(now));
 $('#seek').style.background=`linear-gradient(to right,#9779d4 ${(now-E.START)/(E.END-E.START)*100}%,#e9e4f3 0)`;
 const bucket=Math.floor(now/10);if(bucket!==lastBucket){lastBucket=bucket;currentInsights=E.insights(events,now);renderInsights();renderPitch();}
}
function renderInsights(){
 const d=currentInsights.at(-1),fresh=d&&now-d.t<=180;
 if(fresh){$('#insight-content').innerHTML=`<article class="insight-card"><div class="card-meta"><time>${E.clock(d.t)}</time><span>● ${kindNames[d.kind]}</span></div><h3>${titles[d.kind]}</h3><p>${desc(d,mode==='analyst')}</p><button class="evidence-btn" id="evidence">为什么这么说？ <span>↗</span></button></article>`;$('#evidence').onclick=()=>showEvidence(d);}
 else $('#insight-content').innerHTML=`<article class="insight-card empty-card"><div class="card-meta">${E.clock(now)} <span>持续观察中</span></div><h3>${now-E.START<240?'先看一会儿，再下判断。':'这段比赛，暂时没有明显变化。'}</h3><p>${now-E.START<240?'正在积累足够的事件，对比前后两个时间窗口。你可以继续播放比赛。':'当前事件没有达到变化提示条件。没有新提示，也是一种有依据的结果。'}</p></article>`;
 const s=E.stats(events,now);$('#stats').innerHTML=`${statRow('右侧事件占比',pct(s.right,s.n),s.n?s.right/s.n*100:0)}${statRow('进攻三区内事件',`${s.third} / ${s.n}`,s.n?s.third/s.n*100:0)}<p class="stat-note">统计截至 ${E.clock(now)} · 不代表控球率或进球概率</p>`;
 $('#history-count').textContent=currentInsights.length+' 个已识别时刻';
 $('#history').innerHTML=currentInsights.length?currentInsights.slice(-3).map(d=>`<button class="history-item" data-key="${d.key}"><time>${E.clock(d.t)} <span> / ${kindNames[d.kind]}</span></time><strong>${shortTitles[d.kind]}</strong><span>查看事件依据 ↗</span></button>`).join(''):'<div class="history-empty">比赛还没有出现达到条件的变化。继续回放，时间轴会在发现变化时留下标记。</div>';
 document.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>showEvidence(currentInsights.find(d=>d.key===b.dataset.key)));
 $('#markers').innerHTML=currentInsights.map(d=>`<button class="marker" style="left:${(d.t-E.START)/(E.END-E.START)*100}%" data-time="${d.t}" aria-label="跳转到 ${E.clock(d.t)} ${shortTitles[d.kind]}" title="${E.clock(d.t)} ${shortTitles[d.kind]}"></button>`).join('');
 document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{setPlaying(false);seek(+b.dataset.time)});
}
function statRow(label,value,width){return `<div class="stat-row"><div class="stat-label"><span>${label}</span><b>${value}</b></div><div class="stat-bar"><span style="width:${width}%"></span></div></div>`}
function renderPitch(){
 const recent=focused?[events.find(e=>e.id===focused)].filter(Boolean):E.windowEvents(events,now,40);
 const latest=currentInsights.at(-1);$('#zone-layer').innerHTML=latest?.kind==='flank'&&now-latest.t<=180?'<rect x="36" y="440" width="978" height="204" fill="#b5ebd2" opacity=".07"/><text x="500" y="620" fill="#b0d4c6" font-size="12" letter-spacing="4">RIGHT FLANK</text>':'';
 $('#event-layer').innerHTML=recent.map((e,i)=>{const color=e.team==='blue'?'#e4f5ff':'#ffc688';const x=35+e.x*9.8,y=35+e.y*6.1,ex=35+e.endX*9.8,ey=35+e.endY*6.1,opacity=.25+(i+1)/recent.length*.75;return `<g opacity="${opacity}"><path d="M${x} ${y} Q${(x+ex)/2} ${(y+ey)/2-15} ${ex} ${ey}" fill="none" stroke="${color}" stroke-width="${i===recent.length-1?3:2}" ${e.type==='regain'?'stroke-dasharray="5 5"':''} marker-end="url(#arrow-${e.team})"/><circle cx="${x}" cy="${y}" r="${i===recent.length-1?11:6}" fill="${color}"/><circle cx="${x}" cy="${y}" r="18" fill="none" stroke="${color}" opacity=".3"/>${i===recent.length-1?`<rect x="${Math.min(835,x-40)}" y="${Math.max(15,y-47)}" width="175" height="25" rx="5" fill="#103c38"/><text x="${Math.min(842,x-33)}" y="${Math.max(32,y-30)}" fill="#e8f5ef" font-size="12">${E.clock(e.t)} ${e.player} · ${eventNames[e.type]}</text>`:''}</g>`}).join('');
 $('#pitch-direction').textContent=focused?'已定位事件 · '+E.clock(recent[0].t):'统一进攻坐标 →';
}
function openDialog(title,body,eyebrow='THE EVIDENCE'){setPlaying(false);$('#dialog-title').textContent=title;$('#dialog-eyebrow').textContent=eyebrow;$('#dialog-body').innerHTML=body;$('#drawer').showModal();$('#drawer').scrollTop=0;}
function eventRows(ids){return ids.map(id=>events.find(e=>e.id===id)).filter(e=>e&&e.t<=now).map(e=>`<button class="event-btn" data-event="${e.id}"><time>${E.clock(e.t)}</time><span class="event-main">${e.player} · ${eventNames[e.type]}<br><small>${e.y>=66?'右侧':e.y<=33?'左侧':'中路'} · ${e.x>=66.7?'进攻三区':'中后场'}</small></span><em>定位到球场 ↗</em></button>`).join('');}
function bindEvents(){document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{const e=events.find(e=>e.id===b.dataset.event);$('#drawer').close();seek(e.t);focused=e.id;renderPitch();$('#pitch').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});}
function showEvidence(d){
 let rule=d.kind==='flank'?'右路定义为统一进攻坐标 y ≥ 66。当前 2 分钟至少 6 条事件、此前至少 4 条，右侧占比至少 65%，且上升至少 30 个百分点。':d.kind==='territory'?'进攻三区定义为事件起点 x ≥ 66.7。当前 2 分钟本队至少 6 条事件，其中至少 5 条在前场，且比此前窗口多至少 4 条。':'同队夺回球权后 25 秒内射门，中间事件均归该队。';
 openDialog('为什么这么说？',`<div class="card-meta">${E.clock(d.t)} · ${shortTitles[d.kind]}</div><div class="evidence-summary">${desc(d,true)}</div><p class="fineprint">${rule}</p><p class="fineprint">解读边界：${d.kind==='flank'?'事件分布变化不证明教练改变了战术，也不衡量防守压力。':d.kind==='territory'?'事件增多不等于控球率更高，也不保证制造出高质量机会。':'这一事件链证明推进很快，但不能独立证明射门质量。'} 阈值为原型设定，尚未用真实赛事验证。</p><h3 class="subhead">支持事件 · 点击回看（${d.ids.length} 条）</h3>${eventRows(d.ids)}${d.baseline.length?`<h3 class="subhead">对照窗口的事件（${d.baseline.length} 条）</h3>${eventRows(d.baseline)}`:''}`);bindEvents();
}
$('#play').onclick=()=>{if(now>=E.END)seek(E.START);focused=null;setPlaying(!playing)};
$('#back').onclick=()=>{setPlaying(false);seek(now-30)};
$('#restart').onclick=()=>{seek(E.START);setPlaying(true)};
$('#speed').onchange=e=>{speed=+e.target.value;setPlaying(playing)};
$('#seek').oninput=e=>{setPlaying(false);seek(+e.target.value)};
$('#scenario').onchange=e=>{scenario=e.target.value;events=E.makeMatch(scenario);setPlaying(false);seek(scenario==='counter'?59*60+30:63*60+30)};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});renderInsights()};
$('#close-dialog').onclick=()=>$('#drawer').close();
$('#drawer').addEventListener('click',e=>{if(e.target===$('#drawer')){const r=$('#drawer').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#drawer').close();}});
$('#recap').onclick=()=>{const ds=currentInsights.filter(d=>d.t>now-300),es=E.windowEvents(events,now,300);openDialog('刚才的五分钟',`<p class="dialog-copy">${E.clock(Math.max(E.START,now-300))} — ${E.clock(now)} · ${es.length} 条已发生事件。${ds.length?'以下是这段时间达到提示条件的变化。':'这段时间没有达到提示条件的变化。'}</p>${ds.slice(-3).map(d=>`<div class="recap-item"><time>${E.clock(d.t)}</time><h3>${shortTitles[d.kind]}</h3><p>${desc(d,mode==='analyst')}</p><button class="evidence-btn recap-evidence" data-recap="${d.key}">查看依据 ↗</button></div>`).join('')}<p class="fineprint">仅基于当前回放时间之前的事件。摘要不读取后续比赛。</p>`,'YOUR FIVE-MINUTE CATCH-UP');document.querySelectorAll('[data-recap]').forEach(b=>b.onclick=()=>{const d=ds.find(d=>d.key===b.dataset.recap);$('#drawer').close();showEvidence(d)});};
$('#about').onclick=()=>openDialog('这个版本能做什么',`<p class="dialog-copy">MatchLens v0.1 是一个可交互的足球观赛原型。三段虚构比赛用于检验：发现变化、解释变化、回看证据，以及没有变化时保持安静。</p><div class="evidence-summary">已实现：回放与拖动时间轴、3 类规则检测、两种解释深度、证据回看、5 分钟摘要。所有计算均在本地浏览器进行。</div><p class="dialog-copy">未接入：真实比赛、球员追踪、微软云服务及大语言模型。当前文案由统计结果填入规则模板，不是 AI 实时推理。</p><p class="fineprint">场景与事件均为合成数据，不代表真实球队或比赛；固定 0:0，样本没有进球事件。场景数据使用确定性种子生成，阈值尚未校准。双方坐标均归一化为从左向右进攻。</p>`,'ABOUT THIS PROTOTYPE');
let last=performance.now();function tick(ts){const dt=Math.min((ts-last)/1000,1);last=ts;if(playing&&!document.hidden){now=Math.min(E.END,now+dt*speed);render();if(now>=E.END)setPlaying(false)}requestAnimationFrame(tick)}render();requestAnimationFrame(tick);
