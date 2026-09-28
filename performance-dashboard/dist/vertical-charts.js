'use strict';
function verticalChart(items,max,unit,grouped=false,references=[]){
 const ticks=[4,3,2,1,0].map(i=>'<span>'+fmt(max*i/4)+unit+'</span>').join('');
 const columns=items.map(item=>'<button class="v-column" '+item.attribute+' aria-label="'+esc(item.accessible)+'"><span class="v-bars">'+item.values.map(v=>'<span class="v-slot"><span class="v-bar '+v.color+'" style="height:'+Math.max(0,v.value??0)/max*100+'%"><span class="v-value">'+esc(v.label)+'</span></span></span>').join('')+'</span><span class="v-label">'+esc(item.label)+'<small>'+esc(item.meta)+'</small></span></button>').join('');
 const lines=references.filter(r=>r.value!==null).map(r=>'<span class="v-reference '+r.color+'" style="top:'+(1-r.value/max)*100+'%" data-average="'+r.value+'" title="'+esc(r.label)+'"></span>').join('');
 return'<div class="v-scroll"><div class="v-chart '+(grouped?'v-grouped':'')+'"><div class="v-axis">'+ticks+'</div><div class="v-content"><div class="v-grid" aria-hidden="true"></div><div class="v-columns">'+columns+'</div><div class="v-reference-layer" aria-hidden="true">'+lines+'</div></div></div></div>';
}
function renderVerticalCharts(areaStats,countMode,axisMax,groups){
 const compare=$('area-view').value==='cap-compare',limit=Number($('cap-limit').value);
 $('area-chart-note').textContent=compare?'실행과제별 가중평균의 영역 평균 · 원값과 선택 상한 '+limit+'% 비교. 상한은 아래 비교 영역에서 선택합니다. 일부 지표만 필터링하면 부분 계산입니다.':'세부지표 원본 판정 기준입니다. 상한 적용 시 개별 지표의 달성여부는 바뀌지 않습니다.';
 if(compare){const tasks=isTaskView()?viewScores(visible,limit):taskScores(visible,limit),stats=Object.entries(areas).map(([a,label])=>{const t=tasks.filter(d=>d.area===a);return{a,label,raw:mean(t,'raw'),cap:mean(t,'cap'),n:t.filter(d=>d.raw!==null).length};}),max=Math.max(100,Math.ceil(Math.max(0,...stats.flatMap(d=>[d.raw??0,d.cap??0]))/40)*40);
 const rawAverage=mean(tasks,'raw'),capAverage=mean(tasks,'cap');
 $('area-legend').hidden=false;$('area-legend').innerHTML='<span class="raw-key">■ 원값</span> <span class="cap-key">■ '+limit+'% 상한</span><span class="average-key raw-key"><i></i> 원값 전체 평균 '+pct(rawAverage)+'</span><span class="average-key cap-key"><i></i> 상한 전체 평균 '+pct(capAverage)+'</span>';
 $('area-chart-note').textContent+=' 점선은 현재 필터에 포함된 모든 산출 가능한 실행과제의 단순평균입니다.';
 $('areas').innerHTML=verticalChart(stats.map(d=>({attribute:'data-area="'+d.a+'"',accessible:d.a+' '+d.label+'; 원값 '+pct(d.raw)+', 상한 '+pct(d.cap)+'; 영역 필터 적용',label:d.a+' · '+d.label,meta:(isStrategyView()?'전략과제':'실행과제')+' '+d.n+'개',values:[{value:d.raw,label:pct(d.raw),color:'raw'},{value:d.cap,label:pct(d.cap),color:'capped'}]})),max,'%',true,[{value:rawAverage,color:'raw',label:'원값 전체 평균 '+pct(rawAverage)},{value:capAverage,color:'capped',label:limit+'% 상한 전체 평균 '+pct(capAverage)}]);
 }else $('area-legend').innerHTML='■ 달성 <em>■ 미달성</em>';
 if($('area-view').value.startsWith('vertical'))$('areas').innerHTML=verticalChart(areaStats.map(d=>({attribute:'data-area="'+d.a+'"',accessible:d.a+' '+d.label+'; 달성 '+d.yes+'개, 미달성 '+d.no+'개; 영역 필터 적용',label:d.a+' · '+d.label,meta:'전체 '+d.total+'개',values:countMode?[{value:d.yes,label:d.yes+'개',color:'good'},{value:d.no,label:d.no+'개',color:'bad'}]:[{value:d.p,label:d.p===null?'—':d.p.toFixed(1)+'%',color:'good'}]})),axisMax,countMode?'개':'%',countMode);
 {
  const max=Math.max(4,Math.ceil(Math.max(0,...groups.map(d=>d.bad))/4)*4);
  $('departments').innerHTML=groups.length?verticalChart(groups.map(d=>({attribute:'data-dept="'+esc(d.dept)+'"',accessible:d.dept+'; 미달성 '+d.bad+'개, 담당 '+d.total+'개; 부서 필터 적용',label:d.dept,meta:'담당 '+d.total+'개',values:[{value:d.bad,label:d.bad+'개',color:'bad'}]})),max,'개'):'<p>해당하는 부서가 없습니다.</p>';
 }
}
