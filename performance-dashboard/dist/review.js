'use strict';
let reviewExport={low:[],high:[],mode:'detail',limit:150};
function renderReview(rows,tasks,limit){
 const mode=$('threshold-level').value,taskMode=mode!=='detail',selected=$('review-dept').value;
 const available=[...new Set(rows.map(d=>d.dept))].sort((a,b)=>a.localeCompare(b,'ko'));
 options('review-dept',available,'전체 부서');if(available.includes(selected))$('review-dept').value=selected;
 const dept=$('review-dept').value;
 if(mode==='strategy')tasks=strategyScores(rows,limit);
 const unit=mode==='strategy'?'전략과제':'실행과제';
 const grouped=(items)=>items.filter(d=>!dept||(taskMode?d.items.some(i=>i.dept===dept):d.dept===dept)).map(d=>({...d,reviewDepartment:taskMode?[...new Set(d.items.map(i=>i.dept))].sort((a,b)=>a.localeCompare(b,'ko')).join(' / '):d.dept})).sort((a,b)=>a.reviewDepartment.localeCompare(b.reviewDepartment,'ko')||(taskMode?a.raw-b.raw:a.rate-b.rate));
 const low=grouped(taskMode?tasks.filter(d=>d.raw!==null&&d.raw<80):rows.filter(d=>validRate(d)&&d.rate<80)),high=grouped(taskMode?tasks.filter(d=>d.raw!==null&&d.raw>=130):rows.filter(d=>validRate(d)&&d.rate>=130));
 reviewExport={low,high,mode,limit};
 function show(id,items){const departmentCount=new Set(items.flatMap(d=>taskMode?d.items.map(i=>i.dept):[d.dept])).size;$(id+'-count').textContent=items.length+'개 '+(taskMode?(mode==='strategy'?'전략과제':'실행과제'):'세부지표')+' · '+departmentCount+'개 부서';let last='';$(id).innerHTML=items.length?'<table><thead><tr><th>실행과제 / '+(taskMode?'과제명':'세부지표')+'</th><th>담당부서</th><th>원값</th><th>'+limit+'% 상한</th><th>변화(%p)</th></tr></thead><tbody>'+items.map(d=>{const raw=taskMode?d.raw:d.rate,cap=taskMode?d.cap:Math.min(raw,limit);let header='';if(last!==d.reviewDepartment){last=d.reviewDepartment;header='<tr class="review-group"><td colspan="5">'+esc(last)+'</td></tr>';}return header+'<tr '+(!taskMode?'tabindex="0" data-row="'+d.row+'" aria-label="'+esc(d.title)+' 상세 보기"':'')+'><td><b>'+esc(d.code)+'</b><small>'+esc(d.title)+'</small>'+(!taskMode?'<small>'+esc(d.detail||d.measure)+'</small>':'')+'</td><td>'+esc(d.reviewDepartment)+'</td><td>'+pct(raw)+'</td><td>'+pct(cap)+'</td><td>'+(cap-raw).toFixed(2)+'</td></tr>';}).join('')+'</tbody></table>':'<p class="empty-range">현재 조건에 해당하는 검토 대상이 없습니다.</p>';}
 show('low-list',low);show('high-list',high);
 $('threshold-context').textContent='대상 선정: '+(taskMode?(mode==='strategy'?'전략과제 실행과제 평균':'실행과제 가중평균'):'세부지표 달성률')+' 원값 기준. 80%는 미만에 포함하지 않고 130%는 이상에 포함합니다. 검토 부서: '+(dept||'전체')+'. 상단 필터와 검토 부서 필터를 함께 적용합니다.';
}
function bindReviewControls(){
 $('review-dept').onchange=render;$('review-reset').onclick=()=>{$('review-dept').value='';render();};
 $('review-download').onclick=()=>{if(!window.XLSX){message('엑셀 다운로드 기능을 불러올 수 없습니다.',true);return;}const {low,high,mode,limit}=reviewExport,taskMode=mode!=='detail',wb=XLSX.utils.book_new();
 const sheet=(name,items)=>{const header=['담당부서','실행과제','지표명','세부 측정방법','원본 행','목표값','달성값','단위','원값 달성률(%)',limit+'% 상한 달성률(%)','변화(%p)','검토 구간'];const aoa=[header,...items.map(d=>{const raw=taskMode?d.raw:d.rate,cap=taskMode?d.cap:Math.min(raw,limit);return[d.reviewDepartment,d.code,d.title,taskMode?null:d.detail,taskMode?null:d.row,taskMode?null:d.target,taskMode?null:d.actual,taskMode?'%':d.unit,raw,cap,cap-raw,name];})];const ws=XLSX.utils.aoa_to_sheet(aoa);ws['!cols']=[{wch:32},{wch:14},{wch:50},{wch:65},...Array(8).fill({wch:20})];for(let r=1;r<aoa.length;r++)for(const c of [5,6,8,9,10]){const cell=ws[XLSX.utils.encode_cell({r,c})];if(cell?.t==='n')cell.z='0.00';}ws['!autofilter']={ref:ws['!ref']};XLSX.utils.book_append_sheet(wb,ws,name);};sheet('80% 미만',low);sheet('130% 이상',high);
 const meta=[['항목','내용'],['분석 단위',taskMode?(mode==='strategy'?'전략과제':'실행과제'):'세부지표'],['상한값',limit],['검토 담당부서',$('review-dept').value||'전체'],['전체 영역 필터',$('area').value||'전체'],['전체 담당부서 필터',$('dept').value||'전체'],['지표 구분',$('kpi').value||'전체'],['달성 상태',$('status').value||'전체'],['검색',$('search').value],['원본',fileName],['시트',sheetName],['목록 기준','원값 <80%, 원값 ≥130%; 목표값 0 및 결측 제외'],['실행과제 계산','산출 가능한 지표 가중치 합으로 재정규화; 일부 필터는 부분 계산'],['80% 미만 대상 수',low.length],['130% 이상 대상 수',high.length]];const ws=XLSX.utils.aoa_to_sheet(meta);ws['!cols']=[{wch:28},{wch:100}];XLSX.utils.book_append_sheet(wb,ws,'조회 조건');XLSX.writeFile(wb,currentYear+'_지표_개선_검토대상_상한'+limit+'.xlsx');};
}
