'use strict';
const $=id=>document.getElementById(id),areas={S:'대학교육혁신',M:'학생지원 강화',A:'지산학상생협력',R:'글로컬교육소외타파',T:'대학경영혁신'};
const builtInSources={2023:window.HISTORY_DATA['2023'],2024:window.HISTORY_DATA['2024'],2025:window.DEFAULT_DATA};
const sources={...builtInSources};
let currentYear=2025,data=[],visible=[],page=0,fileName='',sheetName='',audit={};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()!==''&&v.trim()!=='-'&&Number.isFinite(Number(v.replace(/,/g,'')))?Number(v.replace(/,/g,'')):null;
const fmt=v=>v===null||v===undefined||v===''?'—':typeof v==='number'?v.toLocaleString('ko-KR',{maximumFractionDigits:2}):String(v);
const clean=v=>String(v??'').replace(/\s+/g,'').trim();
function parseRows(raw,merges,year){
 const rows=raw.map(r=>r.slice());
 for(const m of merges||[])for(let r=m.s.r;r<=m.e.r;r++)for(let c=m.s.c;c<=m.e.c;c++){rows[r]??=[];if(rows[r][c]==null)rows[r][c]=raw[m.s.r]?.[m.s.c];}
 const h=rows.findIndex(r=>r.some(v=>clean(v)==='담당부서')&&r.some(v=>clean(v)==='세부지표명'));
 if(h<0)throw Error('담당부서와 세부지표명 헤더를 찾을 수 없습니다. 성과지표 양식을 확인해주세요.');
 const upper=rows[h],lower=rows[h+1]||[];
 const find=(names,both=false)=>{for(let c=0;c<Math.max(upper.length,lower.length);c++)if(names.includes(clean(upper[c]))||(both&&names.includes(clean(lower[c]))))return c;return -1;};
 const map={strategy:find(['전략과제','전략과제명']),task:find(['실행과제(성과지수)','성과지수']),title:find(['세부지표명']),measure:find(['측정내용']),method:find(['측정방법']),detail:find(['세부측정방법']),code:find(['지표번호']),dept:find(['담당부서']),baseMethod:find(['기준값설정방법']),kpi:find(['핵심지표(KPI)여부']),unit:find(['단위'],true),base:find(['기준값'],true),target:find(['목표값'],true),actual:find(['달성값'],true),rate:find(['달성률'],true),weight:find(['가중치(%)','가중치']),weighted:find(['가중치반영값']),status:find(['달성여부']),note:find(['비고'])};
 for(const key of ['code','dept','unit','target','actual','rate','status'])if(map[key]<0)throw Error('필수 열을 찾을 수 없습니다: '+key);
 const result=[];let missing=0,mismatch=0,zeroTarget=0;
 for(let r=h+2;r<rows.length;r++){
  const row=rows[r],code=String(row[map.code]??'').trim();
  if(!/^[SMART]\d+-\d+$/.test(code)||!row[map.dept]||(!row[map.title]&&!row[map.measure]&&!row[map.detail]))continue;
  const item={row:r+1,id:year+':'+(r+1)};
  for(const [key,c]of Object.entries(map))item[key]=c>=0?(row[c]??null):null;
  item.code=code;item.area=code[0];item.task=String(item.task??'').replace(/\n?\(달성\s*\d+개,\s*미달성\s*\d+개\)/g,'').trim();item.title=item.title||item.measure||item.detail;
  for(const key of ['base','target','actual','rate','weight','weighted'])item[key]=num(item[key]);
  item.status=['달성','미달성'].includes(item.status)?item.status:'판정 불가';
  item.warning=[];if(item.actual===null||item.rate===null){missing++;item.warning.push('실적 또는 달성률 결측');}
  if(item.target===0){zeroTarget++;item.warning.push('목표값 0: 계산 기준 검토');}
  if(item.target!==null&&item.actual!==null&&item.status!=='판정 불가'&&item.status!==(item.actual>=item.target?'달성':'미달성')){mismatch++;item.warning.push('원본 판정과 상향 목표 계산 불일치');}
  result.push(item);
 }
 if(!result.length)throw Error('분석 가능한 성과지표 행이 없습니다. 지표번호와 데이터 형식을 확인해주세요.');
 return{data:result,audit:{missing,mismatch,zeroTarget}};
}
function options(id,values,label){$(id).innerHTML='<option value="">'+label+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(id==='area'?v+' · '+(areas[v]||v):v)+'</option>').join('');}
function load(source,year){
 const parsed=parseRows(source.rows,source.merges,year);currentYear=Number(year);sheetName=source.sheet;fileName=source.name;data=parsed.data;audit=parsed.audit;
 const historical=currentYear===2023;
 for(const a of Object.keys(areas))areas[a]=historical?currentYear+' '+a+'영역':({S:'대학교육혁신',M:'학생지원 강화',A:'지산학상생협력',R:'글로컬교육소외타파',T:'대학경영혁신'})[a];
 $('year').value=String(year);$('period').textContent=year+'학년도';document.title=year+'학년도 대학 성과관리';
 $('kpi').disabled=!data.some(d=>d.kpi);$('kpi').title=$('kpi').disabled?'이 학년도 원본에는 핵심지표 구분이 없습니다.':'';
 $('cap-source').textContent=year===2025?'출처: 2025학년도 중장기발전계획 성과지표 분석 결과보고서, Ⅰ-6 분석 대상 및 산출 방법, Ⅱ-3-나 극단값 영향 분석.':'출처: 첨부 엑셀의 '+year+' 달성값 시트. 상한 비교는 대시보드에서 동일한 계산식을 적용한 참고 분석이며 해당 연도 공식 보고서 수치가 아닙니다.';
 options('area',[...new Set(data.map(d=>d.area))].sort(),'전체 영역');options('dept',[...new Set(data.map(d=>d.dept))].sort((a,b)=>a.localeCompare(b,'ko')),'전체 부서');
 $('review-dept').value='';reset();$('source').textContent=fileName+' · '+sheetName+' · '+data.length+'개 세부지표';
 const counts={2023:[280,129,151],2024:[287,205,81],2025:[209,166,43]},[total,passed,failed]=counts[year];
 $('audit').textContent='분석 행 '+data.length+'개 · 결측 '+audit.missing+'개 · 목표값 0 '+audit.zeroTarget+'개 · 판정 검토 '+audit.mismatch+'개. '+(data.length===total&&data.filter(d=>d.status==='달성').length===passed&&data.filter(d=>d.status==='미달성').length===failed?'첨부 자료 기준('+total+'개 / 달성 '+passed+'개 / 미달성 '+failed+'개)과 일치합니다.':year+'학년도 첨부 자료 기준('+total+'개 / 달성 '+passed+'개 / 미달성 '+failed+'개)과 다릅니다. 업로드 자료를 확인해주세요.');
}
function reset(){for(const id of ['area','dept','kpi','status','search'])$(id).value='';page=0;render();}
function render(){
 const taskMode=isTaskView();
 $('area-view').options[0].textContent=taskMode?groupName()+' 달성 비율':'지표 달성 비율';
 $('area-view').options[1].textContent=taskMode?'달성·미달성 '+groupName()+' 수':'달성·미달성 지표 수';
 $('list-heading').textContent=taskMode?groupName()+' 현황':'세부지표 현황';
 $('list-note').textContent=taskMode?'행을 선택하면 과제의 구성 지표와 가중치를 확인할 수 있습니다.':'행을 선택하면 측정방법과 원본 위치를 확인할 수 있습니다.';
 $('view-note').textContent=isStrategyView()?'전략과제는 실행과제 코드의 상위 단위(S1 등)로 묶고, 소속 실행과제 점수의 단순평균으로 판정합니다. 필터로 조회해도 전체 구성 과제로 계산합니다.':taskMode?groupName()+' 원값 평균으로 판정합니다. 부서·지표 구분·검색은 해당 지표가 포함된 과제를 찾으며 점수는 전체 구성 지표로 계산합니다.':'세부지표의 원본 달성 판정을 표시합니다.';
 $('dept-chart-note').textContent='미달성 지표가 많은 순 · 공동부서는 원본 단위로 집계';
 $('indicator-table').querySelector('thead').innerHTML='<tr><th>영역 / 실행과제</th><th>세부지표 / 측정 항목</th><th>담당부서</th><th>구분</th><th>목표값</th><th>달성값</th><th>달성률</th><th>상태</th></tr>';
 const q=$('search').value.trim().toLowerCase();visible=taskMode?selectTasks():data.filter(d=>(!$('area').value||d.area===$('area').value)&&(!$('dept').value||d.dept===$('dept').value)&&(!$('kpi').value||d.kpi===$('kpi').value)&&(!$('status').value||d.status===$('status').value)&&(!q||[d.title,d.task,d.measure,d.detail,d.code].join(' ').toLowerCase().includes(q)));
 const sort=$('sort').value;visible.sort((a,b)=>sort==='source'?a.row-b.row:sort==='rate-desc'?(b.rate??-Infinity)-(a.rate??-Infinity)||a.row-b.row:sort==='kpi'?(a.kpi==='핵심지표'?0:1)-(b.kpi==='핵심지표'?0:1)||(a.rate??Infinity)-(b.rate??Infinity):(a.rate??Infinity)-(b.rate??Infinity)||a.row-b.row);
 const n=visible.length,passed=visible.filter(d=>d.status==='달성').length,failed=visible.filter(d=>d.status==='미달성').length,den=passed+failed,k=visible.filter(d=>d.kpi==='핵심지표'),kp=k.filter(d=>d.status==='달성').length,kden=k.filter(d=>d.status!=='판정 불가').length;
 $('cards').innerHTML=[['전체 지표',n,'현재 필터 대상',''],['달성 지표',passed,'목표를 달성한 지표','green'],['미달성 지표',failed,'개선 검토 대상','red'],['지표 달성 비율',den?(passed/den*100).toFixed(1)+'%':'—','판정 가능 '+den+'개 기준','accent'],['핵심지표 달성',kden?(kp/kden*100).toFixed(1)+'%':'—',k.length?kp+'개 달성 / 핵심지표 '+k.length+'개':'원본에 핵심지표 구분 없음','']].map(([l,v,s,c])=>'<article class="card '+(c==='accent'?c:'')+'"><span class="label">'+l+'</span><strong class="'+(c==='accent'?'':c)+'">'+v+'</strong><small>'+s+'</small></article>').join('');
 const areaStats=Object.entries(areas).map(([a,label])=>{const arr=visible.filter(d=>d.area===a),yes=arr.filter(d=>d.status==='달성').length,no=arr.filter(d=>d.status==='미달성').length;return{a,label,total:arr.length,yes,no,p:yes+no?yes/(yes+no)*100:null};});
 const countMode=$('area-view').value.includes('count'),axisMax=countMode?Math.max(10,Math.ceil(Math.max(...areaStats.map(d=>Math.max(d.yes,d.no)))/10)*10):100;
 $('area-legend').hidden=!countMode;
 const groups=[...new Set(visible.map(d=>d.dept))].map(dept=>({dept,total:visible.filter(d=>d.dept===dept).length,bad:visible.filter(d=>d.dept===dept&&d.status==='미달성').length})).sort((a,b)=>b.bad-a.bad||b.total-a.total).slice(0,6),max=Math.max(1,...groups.map(d=>d.bad));
 renderVerticalCharts(areaStats,countMode,axisMax,groups);
 const pages=Math.max(1,Math.ceil(n/20));page=Math.max(0,Math.min(page,pages-1));$('count').textContent=n+'개';
 $('rows').innerHTML=visible.slice(page*20,page*20+20).map(d=>'<tr tabindex="0" data-row="'+d.row+'" aria-label="'+esc(d.title)+' 상세 보기"><td><b>'+esc(d.code)+'</b><small>'+esc(areas[d.area])+'</small></td><td>'+esc(d.title)+'<small>'+esc(d.detail||d.measure)+'</small></td><td>'+esc(d.dept)+'</td><td><span class="kpi">'+esc(d.kpi||'—')+'</span></td><td>'+esc(fmt(d.target))+'<small>'+esc(d.unit)+'</small></td><td>'+esc(fmt(d.actual))+'</td><td><b>'+esc(fmt(d.rate))+(d.rate===null?'':'%')+'</b>'+(d.warning.length?'<small>검토 필요</small>':'')+'</td><td><span class="tag '+(d.status==='미달성'?'bad':d.status==='판정 불가'?'unknown':'')+'">'+d.status+'</span></td></tr>').join('')||'<tr><td colspan="8">조건에 맞는 지표가 없습니다. 필터를 변경하거나 초기화해주세요.</td></tr>';
 $('page-info').textContent=n?(page*20+1)+'–'+Math.min(n,page*20+20)+' / '+n+'개':'0개';$('prev').disabled=page===0;$('next').disabled=page>=pages-1;
 renderAnalysis(visible,data);bindReviewControls();
 const taskSummary=taskMode?renderTaskView():null;
 if(taskMode)$('report-check').textContent=$('report-check').textContent.replace('상단 카드는 원본 판정을 유지합니다.','상단 카드는 '+groupName()+' 원값 평균을 기준으로 판정합니다.');
 document.querySelectorAll('[data-area]').forEach(el=>el.onclick=()=>{$('area').value=el.dataset.area;page=0;render();});document.querySelectorAll('[data-dept]').forEach(el=>el.onclick=()=>{$('dept').value=el.dataset.dept;page=0;render();});document.querySelectorAll('[data-row]').forEach(el=>{el.onclick=()=>detail(Number(el.dataset.row));el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(Number(el.dataset.row));}};});
 return taskSummary||{total:n,passed,failed,achievementPercent:den?passed/den*100:null};
}
function detail(row){const d=data.find(d=>d.row===row);if(!d)return;const fields=[['실행과제',d.task],['지표번호',d.code],['담당부서',d.dept],['지표 구분',d.kpi],['측정내용',d.measure],['측정방법',d.method],['세부 측정 방법',d.detail],['기준값 설정방법',d.baseMethod],['기준값',fmt(d.base)],['목표값',fmt(d.target)+' '+(d.unit||'')],['달성값',fmt(d.actual)+' '+(d.unit||'')],['달성률',d.rate===null?'—':fmt(d.rate)+'%'],['가중치',d.weight===null?'—':fmt(d.weight*100)+'%'],['가중치 반영값',fmt(d.weighted)],['달성여부',d.status],['비고',d.note],['검토 사항',d.warning.join(' / ')||'없음'],['원본 위치',fileName+' / '+sheetName+' / '+d.row+'행']];$('detail-content').innerHTML='<h2>'+esc(d.title)+'</h2><dl>'+fields.map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v??'—')+'</dd>').join('')+'</dl>';$('detail').showModal();}
for(const id of ['area','dept','kpi','status','sort'])$(id).onchange=()=>{page=0;render();};$('area-view').onchange=render;$('search').oninput=()=>{page=0;render();};$('reset').onclick=reset;$('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};$('close').onclick=()=>$('detail').close();$('detail').onclick=e=>{if(e.target===$('detail')){const b=$('detail').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('detail').close();}};
function message(text,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
$('year').onchange=()=>{load(sources[$('year').value],$('year').value);message(currentYear+'학년도 자료를 조회하고 있습니다.');};
$('restore').onclick=()=>{sources[currentYear]=builtInSources[currentYear];load(sources[currentYear],currentYear);message('기본 '+currentYear+'학년도 자료를 복원했습니다.');};document.querySelector('.upload').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file').click();}};
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>30*1024*1024)throw Error('30MB 이하의 엑셀 파일을 선택해주세요.');if(!window.XLSX)throw Error('엑셀 분석 기능을 불러오지 못했습니다. 페이지를 새로고침해주세요.');message('엑셀 파일을 분석하고 있습니다…');const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),found={};for(const year of [2023,2024,2025]){const sheet=wb.SheetNames.find(n=>n.includes(String(year))&&/달성/.test(n));if(!sheet)continue;const ws=wb.Sheets[sheet],raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,blankrows:true,range:{s:{r:0,c:0},e:XLSX.utils.decode_range(ws['!ref']).e}});const source={rows:raw,merges:ws['!merges']||[],name:f.name,sheet};parseRows(source.rows,source.merges,year);found[year]=source;}const years=Object.keys(found);if(!years.length)throw Error('2023·2024·2025 달성값 시트를 찾지 못했습니다.');Object.assign(sources,found);const selected=found[currentYear]?currentYear:Number(years.at(-1));load(sources[selected],selected);message(years.join('·')+'학년도 자료를 불러왔습니다. 연도 선택으로 각각 조회할 수 있습니다.');}catch(err){message(err.message||'파일을 분석할 수 없습니다. 파일 형식을 확인해주세요.',true);}finally{e.target.value='';}};
$('download').onclick=()=>{if(isTaskView()){downloadTasks();return;}const columns=[['원본행','row'],['지표번호','code'],['실행과제','task'],['세부지표명','title'],['측정내용','measure'],['세부측정방법','detail'],['담당부서','dept'],['지표구분','kpi'],['단위','unit'],['기준값','base'],['목표값','target'],['달성값','actual'],['달성률(%)','rate'],['가중치','weight'],['가중치반영값','weighted'],['달성여부','status'],['비고','note']];const cell=v=>{let s=String(v??'');if(typeof v==='string'&&/^[=+@-]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';};const csv='\uFEFF'+[columns.map(c=>cell(c[0])).join(','),...visible.map(d=>columns.map(c=>cell(d[c[1]])).join(','))].join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=currentYear+'_성과지표_필터결과.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('view-level').onchange=()=>{page=0;$('threshold-level').value=$('view-level').value;render();};
$('threshold-level').onchange=render;
$('cap-limit').onchange=render;

load(sources[2025],2025);
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'filter_performance_indicators',title:'성과지표 필터',description:'대시보드의 영역과 달성여부 필터를 변경하고 현재 집계를 반환합니다.',inputSchema:{type:'object',properties:{area:{type:'string',enum:['','S','M','A','R','T']},status:{type:'string',enum:['','달성','미달성','판정 불가']}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['area','status'].includes(k))||('area'in input&&!['','S','M','A','R','T'].includes(input.area))||('status'in input&&!['','달성','미달성','판정 불가'].includes(input.status)))throw Error('유효하지 않은 필터');if('area'in input)$('area').value=input.area;if('status'in input)$('status').value=input.status;page=0;return render();}})).catch(()=>{});}catch{}}
