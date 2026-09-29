'use strict';
let taskVisible=[];
const isTaskView=()=>['task','strategy'].includes($('view-level').value);
const isStrategyView=()=>$('view-level').value==='strategy';
const groupName=()=>isStrategyView()?'전략과제':'실행과제';
function strategyScores(rows,limit=150){
 const groups=new Map();for(const t of taskScores(rows,limit)){const code=t.code.split('-')[0];if(!groups.has(code))groups.set(code,[]);groups.get(code).push(t);}
 return [...groups].map(([code,tasks])=>({code,area:code[0],title:tasks.flatMap(t=>t.items).find(d=>d.strategy)?.strategy||code+' 전략과제',raw:mean(tasks,'raw'),cap:mean(tasks,'cap'),tasks,items:tasks.flatMap(t=>t.items)}));
}
const viewScores=(rows,limit=150)=>isStrategyView()?strategyScores(rows,limit):taskScores(rows,limit);
const taskStatus=t=>t.raw===null?'판정 불가':t.raw>=100?'달성':'미달성';
const taskDepartments=t=>[...new Set(t.items.map(d=>d.dept))].join(' / ');
function selectTasks(){
 const q=$('search').value.trim().toLowerCase();
 taskVisible=viewScores(data,Number($('cap-limit').value)).filter(t=>
  (!$('area').value||t.area===$('area').value)&&
  (!$('dept').value||t.items.some(d=>d.dept===$('dept').value))&&
  (!$('kpi').value||t.items.some(d=>d.kpi===$('kpi').value))&&
  (!$('status').value||taskStatus(t)===$('status').value)&&
  (!q||[t.code,t.title,...t.items.flatMap(d=>[d.title,d.task,d.code,d.measure,d.detail])].join(' ').toLowerCase().includes(q)));
 const sort=$('sort').value;
 taskVisible.sort((a,b)=>sort==='source'?a.items[0].row-b.items[0].row:sort==='kpi'?Number(b.items.some(d=>d.kpi==='핵심지표'))-Number(a.items.some(d=>d.kpi==='핵심지표'))||(a.raw??Infinity)-(b.raw??Infinity):sort==='rate-desc'?(b.raw??-Infinity)-(a.raw??-Infinity):(a.raw??Infinity)-(b.raw??Infinity));
 return taskVisible.flatMap(t=>t.items);
}
function renderTaskView(){
 const tasks=taskVisible,n=tasks.length,passed=tasks.filter(t=>taskStatus(t)==='달성').length,failed=tasks.filter(t=>taskStatus(t)==='미달성').length,den=passed+failed,limit=Number($('cap-limit').value);
 $('cards').innerHTML=[['전체 '+groupName(),n,'현재 필터 대상',''],['달성 '+groupName(),passed,isStrategyView()?'실행과제 평균 100% 이상':'원값 가중평균 100% 이상','green'],['미달성 '+groupName(),failed,isStrategyView()?'실행과제 평균 100% 미만':'원값 가중평균 100% 미만','red'],[groupName()+' 달성 비율',den?(passed/den*100).toFixed(1)+'%':'—','판정 가능 '+den+'개 기준','accent'],[groupName()+' 평균',pct(mean(tasks,'raw')),'판정 불가 '+(n-den)+'개 제외','']].map(([l,v,s,c])=>'<article class="card '+(c==='accent'?c:'')+'"><span class="label">'+l+'</span><strong class="'+(c==='accent'?'':c)+'">'+v+'</strong><small>'+s+'</small></article>').join('');
 const stats=Object.entries(areas).map(([a,label])=>{const arr=tasks.filter(t=>t.area===a),yes=arr.filter(t=>taskStatus(t)==='달성').length,no=arr.filter(t=>taskStatus(t)==='미달성').length;return{a,label,total:arr.length,yes,no,p:yes+no?yes/(yes+no)*100:null};});
 const groups=[...new Set(tasks.flatMap(t=>t.items.map(d=>d.dept)))].map(dept=>{const arr=tasks.filter(t=>t.items.some(d=>d.dept===dept));return{dept,total:arr.length,bad:arr.filter(t=>taskStatus(t)==='미달성').length};}).sort((a,b)=>b.bad-a.bad||b.total-a.total).slice(0,6);
 const countMode=$('area-view').value.includes('count');
 renderVerticalCharts(stats,countMode,countMode?Math.max(4,Math.ceil(Math.max(...stats.map(d=>Math.max(d.yes,d.no)))/4)*4):100,groups);
 if($('area-view').value==='cap-compare')$('area-chart-note').textContent=(isStrategyView()?'전략과제별 실행과제 평균으로 계산한 영역 평균 · 원값과 ':'과제 전체 구성 지표의 가중평균으로 계산한 영역 평균 · 원값과 ')+limit+'% 상한 비교. 점선은 현재 조회 과제의 전체 평균입니다.';
 else $('area-chart-note').textContent=groupName()+' 원값 평균 기준: 100% 이상 달성, 산출불가 과제는 달성 비율에서 제외합니다.';
 $('dept-chart-note').textContent='미달성 '+groupName()+'가 많은 순 · 여러 부서가 참여한 과제는 각 부서에 1개씩 표시합니다.';
 const pages=Math.max(1,Math.ceil(n/20));page=Math.max(0,Math.min(page,pages-1));$('count').textContent=n+'개';
 $('indicator-table').querySelector('thead').innerHTML='<tr><th>영역 / '+groupName()+'</th><th>'+groupName()+'</th><th>관련 담당부서</th><th>구성 지표</th><th>산출 가능 지표</th><th>원값 평균</th><th>'+limit+'% 상한 적용</th><th>상태 · 원값 기준</th></tr>';
 $('rows').innerHTML=tasks.slice(page*20,page*20+20).map(t=>'<tr tabindex="0" data-task="'+esc(t.code)+'" aria-label="'+esc(t.code)+' '+groupName()+' 상세 보기"><td><b>'+esc(t.code)+'</b><small>'+esc(areas[t.area])+'</small></td><td>'+esc(t.title||t.code)+(t.tasks?'<small>소속 실행과제 '+t.tasks.length+'개</small>':'')+'</td><td>'+esc(taskDepartments(t))+'</td><td>'+t.items.length+'개</td><td>'+t.items.filter(d=>validRate(d)&&d.weight!==null&&d.weight>0).length+'개</td><td><b>'+pct(t.raw)+'</b></td><td>'+pct(t.cap)+'</td><td><span class="tag '+(taskStatus(t)==='미달성'?'bad':taskStatus(t)==='판정 불가'?'unknown':'')+'">'+taskStatus(t)+'</span></td></tr>').join('')||'<tr><td colspan="8">조건에 맞는 과제가 없습니다.</td></tr>';
 $('page-info').textContent=n?(page*20+1)+'–'+Math.min(n,page*20+20)+' / '+n+'개':'0개';$('prev').disabled=page===0;$('next').disabled=page>=pages-1;
 document.querySelectorAll('[data-task]').forEach(el=>{el.onclick=()=>taskDetail(el.dataset.task);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();taskDetail(el.dataset.task);}};});
 return{total:n,passed,failed,achievementPercent:den?passed/den*100:null};
}
function taskDetail(code){
 const t=taskVisible.find(t=>t.code===code);if(!t)return;
 $('detail-content').innerHTML='<h2>'+esc(t.title||t.code)+'</h2><p class="analysis-note">원값 '+pct(t.raw)+' · '+$('cap-limit').value+'% 상한 '+pct(t.cap)+' · '+taskStatus(t)+'<br>'+(isStrategyView()?'소속 실행과제 점수의 단순평균입니다.':'전체 구성 지표로 계산한 가중평균입니다.')+' 목표값 0, 결측 및 가중치 없는 지표는 점수 산출에서 제외합니다.</p>'+strategyChildren(t)+'<div class="table-wrap"><table><thead><tr><th>세부지표 / 측정 항목</th><th>담당부서</th><th>달성률</th><th>가중치</th><th>산출</th></tr></thead><tbody>'+t.items.map(d=>'<tr tabindex="0" data-task-row="'+d.row+'"><td>'+esc(d.title)+'<small>'+esc(d.detail||d.measure)+'</small></td><td>'+esc(d.dept)+'</td><td>'+pct(d.rate)+'</td><td>'+fmt(d.weight===null?null:d.weight*100)+'%</td><td>'+(validRate(d)&&d.weight!==null&&d.weight>0?'포함':'제외')+'</td></tr>').join('')+'</tbody></table></div><p class="analysis-note">세부지표 행을 선택하면 원본 측정방법을 확인합니다.</p>';
 document.querySelectorAll('[data-task-row]').forEach(el=>{const open=()=>{$('detail').close();detail(Number(el.dataset.taskRow));};el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});$('detail').showModal();
}

function downloadTasks(){
 const cell=v=>{let s=String(v??'');if(typeof v==='string'&&/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const rows=[[groupName()+' 코드',groupName(),'담당부서','구성 지표 수','원값 평균(%)',$('cap-limit').value+'% 상한 적용(%)','원값 판정'],...taskVisible.map(t=>[t.code,t.title,taskDepartments(t),t.items.length,t.raw,t.cap,taskStatus(t)])];
 const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=currentYear+'_'+groupName()+'_필터결과.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function strategyChildren(t){
 if(!t.tasks)return '';
 return '<h3>소속 실행과제 '+t.tasks.length+'개</h3><div class="table-wrap"><table><thead><tr><th>실행과제(성과지수)</th><th>원값</th><th>선택 상한</th><th>판정</th></tr></thead><tbody>'+t.tasks.map(d=>'<tr><td>'+esc(d.title||d.code)+'</td><td>'+pct(d.raw)+'</td><td>'+pct(d.cap)+'</td><td>'+taskStatus(d)+'</td></tr>').join('')+'</tbody></table></div><h3>전체 구성 세부지표</h3>';
}
