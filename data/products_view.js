/* ===== 가공식품(식약처 식품영양성분DB) 계층 ===== */
const PSCH = PRODUCTS.schema.reduce((o,k,i)=>(o[k]=i,o),{});
function pget(r,k){return r[PSCH[k]];}
// 질환 태그(1회 제공량 우선, 없으면 100g/ml 기준)
function ptag(r){
 const serv=pget(r,'servg'); const basis = serv&&serv>0 ? serv/100 : 1;
 const out={}, unit = serv&&serv>0?'1회제공량':'100'+(pget(r,'isml')?'ml':'g');
 for(const k in CRIT){const c=CRIT[k]; let v=pget(r,c.nut); v = v==null?null:v*basis;
   out[k]={tag:tagOne(v,c),val:v};}
 out._basis=unit; out._serv=serv; return out;
}
let pq='', pkind='', pprof={hp:true,dm:false,ob:false,kid:false};
function vProd(){
 return `<div class="card"><h2>가공식품 검색 · 질환별 적합도 <span class="muted" style="font-weight:400">(식약처 식품영양성분DB)</span></h2>
 <div class="flex"><input id="pq" style="flex:1;min-width:240px" placeholder="가공식품명 검색 (예: 라면, 초콜릿, 요구르트, 시리얼)" value="${pq}" oninput="pq=this.value;prefresh()"></div>
 <div class="flex" style="margin-top:10px">내 질환 프로필:
  ${Object.keys(CRIT).map(k=>`<span class="pill ${pprof[k]?'on':''}" onclick="pprof['${k}']=!pprof['${k}'];render()">${CRIT[k].label}</span>`).join('')}</div>
 <p class="muted" style="margin-top:8px">${PRODUCTS.stat.names.toLocaleString()}종(고유 제품명). 값은 공식 100g/100ml 기준이며, 태그는 식품중량이 있으면 <b>1회 제공량</b> 기준으로 환산해 판정합니다.</p>
 </div><div class="card"><div id="plist"></div></div><div id="pmodal"></div>`;
}
function post_prod(){prefresh();}
function prefresh(){const el=document.getElementById('plist');if(!el)return;
 const q=pq.trim(); let rows=PRODUCTS.products;
 if(q) rows=rows.filter(r=>pget(r,'name').includes(q));
 const total=rows.length; rows=rows.slice(0,60);
 const prof=Object.keys(CRIT).filter(k=>pprof[k]);
 el.innerHTML=`<p class="muted">${total.toLocaleString()}건 중 ${rows.length}건 표시</p>
 <table><tr><th>가공식품명</th><th class="right">1회제공</th><th class="right">에너지</th><th class="right">나트륨</th><th class="right">당류</th>${prof.map(k=>`<th>${CRIT[k].label}</th>`).join('')}<th></th></tr>
 ${rows.map((r,i)=>{const t=ptag(r);const serv=pget(r,'servg');const u=pget(r,'isml')?'ml':'g';
  return `<tr class="clickable" onclick="popenP(${PRODUCTS.products.indexOf(r)})"><td><b>${pget(r,'name')}</b></td>
  <td class="right">${serv?fmt(serv)+u:'–'}</td><td class="right">${fmt(pget(r,'en'))}</td><td class="right">${fmt(pget(r,'na'))}</td><td class="right">${fmt(pget(r,'sugar'))}</td>
  ${prof.map(k=>`<td>${tagHtml(t[k].tag)}</td>`).join('')}<td class="muted">상세 ›</td></tr>`}).join('')}</table>
 <p class="muted small">에너지 kcal · 나트륨 mg · 당류 g, 모두 100${'g'} 기준 표시(태그는 1회제공 환산).</p>`;
}
function popenP(idx){const r=PRODUCTS.products[idx];const t=ptag(r);const serv=pget(r,'servg');const u=pget(r,'isml')?'ml':'g';
 const alts=PRODUCTS.products.filter(x=>Object.keys(CRIT).every(k=>!pprof[k]||ptag(x)[k].tag==='ok'))
   .filter(x=>x!==r && pget(x,'name').slice(0,2)===pget(r,'name').slice(0,2)).slice(0,5);
 document.getElementById('pmodal').innerHTML=`<div class="modal" onclick="if(event.target===this)this.remove()"><div class="card">
 <div class="flex"><h2 style="flex:1">${pget(r,'name')}</h2><button class="act" onclick="this.closest('.modal').remove()">닫기</button></div>
 <p class="muted">식품코드 ${pget(r,'code')} · 1회 제공량 ${serv?fmt(serv)+u:'정보없음'} · 판정 기준: ${t._basis}</p>
 <h3>질환별 판정</h3><table>${Object.keys(CRIT).map(k=>{const c=CRIT[k];return `<tr><td>${c.label}</td><td>${tagHtml(t[k].tag)}</td><td>${NUTL[c.nut][0]} ${fmt(t[k].val)}${c.unit} (${t._basis} 기준) / 주의 ${c.caution} · 제한 ${c.limit}</td></tr>`}).join('')}</table>
 <h3>영양성분 (100${u} 기준)</h3><table>${['en','cho','sugar','fat','sfa','prot','chol','na','k','fiber','ca'].map(n=>`<tr><td style="width:110px">${NUTL[n][0]}</td><td class="right">${fmt(pget(r,n))} ${NUTL[n][1]}</td></tr>`).join('')}</table>
 ${alts.length?`<h3>유사 분류 대체 후보(프로필 적합)</h3><table>${alts.map(a=>`<tr class="clickable" onclick="popenP(${PRODUCTS.products.indexOf(a)})"><td>${pget(a,'name')}</td><td class="right">${fmt(pget(a,'en'))} kcal</td><td class="right">나트륨 ${fmt(pget(a,'na'))}</td></tr>`).join('')}</table>`:''}
 </div></div>`;
}
/* ===== 관리자: 가공식품 검수 큐 ===== */
let pqf='all', preview={};
function vPqueue(){const S=PRODUCTS.stat;
 let rows=PRODUCTS.queue; if(pqf!=='all')rows=rows.filter(r=>r[9].includes(pqf));
 return `<div class="grid g4">
 <div class="kpi"><div class="s">가공식품 총계</div><div class="v">${S.names.toLocaleString()}</div><div class="s">고유명 · 코드 ${S.codes.toLocaleString()}</div></div>
 <div class="kpi"><div class="s">검수 대상</div><div class="v" style="color:var(--warn)">${S.queueTotal.toLocaleString()}</div><div class="s">자동 플래그 발생</div></div>
 <div class="kpi"><div class="s">나트륨 이상치</div><div class="v" style="color:var(--bad)">${S.flag.na.toLocaleString()}</div><div class="s">100g당 3,000mg 초과</div></div>
 <div class="kpi"><div class="s">중복 클러스터</div><div class="v">${S.dupClusters.toLocaleString()}</div><div class="s">${S.dupRows.toLocaleString()}행</div></div></div>
 <div class="card"><h2>가공식품 영양성분 검수 큐</h2>
 <p class="muted">규칙: 에너지-영양소 계산 불일치(±30%), 나트륨 100g당 3,000mg 초과, 당류 100g당 80g 초과, 필수값 결측. 표시는 상위 ${PRODUCTS.queue.length.toLocaleString()}건(전체 ${S.queueTotal.toLocaleString()}건).</p>
 <div class="flex" style="margin:8px 0"><span class="pill ${pqf==='all'?'on':''}" onclick="pqf='all';render()">전체</span>
 ${Object.keys(FLAGL).filter(f=>['energy','na','sugar','missing'].includes(f)).map(f=>`<span class="pill ${pqf===f?'on':''}" onclick="pqf='${f}';render()">${FLAGL[f]}</span>`).join('')}</div>
 <table><tr><th>가공식품</th><th>플래그</th><th class="right">에너지</th><th class="right">계산E</th><th class="right">나트륨</th><th class="right">당류</th><th class="right">1회</th><th>상태</th><th>처리</th></tr>
 ${rows.slice(0,120).map((r,i)=>{const calc=(4*(r[3]||0)+4*(r[4]||0)+9*(r[5]||0)).toFixed(0);const st=preview[r[0]];
  return `<tr><td><b>${r[1]}</b><div class="muted small">${r[0]}</div></td><td>${r[9].map(f=>`<span class="chip">${FLAGL[f]}</span>`).join('')}</td>
  <td class="right">${fmt(r[2])}</td><td class="right" style="color:${r[9].includes('energy')?'var(--bad)':'inherit'}">${calc}</td>
  <td class="right">${fmt(r[6])}</td><td class="right">${fmt(r[7])}</td><td class="right">${r[8]?fmt(r[8])+'g':'–'}</td>
  <td>${st?tagStatus(st):'<span class="tag t-warn">대기</span>'}</td>
  <td><button class="act" onclick="preview['${r[0]}']='approved';render()">승인</button> <button class="act" onclick="preview['${r[0]}']='rejected';render()">반려</button></td></tr>`}).join('')}</table></div>`;
}
/* ===== 관리자: 가공식품 중복 관리 ===== */
let pdupRep={};
function vPdup(){
 return `<div class="card"><h2>가공식품 표준화 · 중복 관리</h2>
 <p class="muted">정규화 후 동일 제품명이 서로 다른 식품코드로 존재하는 군집입니다(상위 ${PRODUCTS.clusters.length.toLocaleString()}개 표시). 대표 코드를 지정해 중복을 정리합니다.</p>
 <table><tr><th>정규화 명칭</th><th>후보 코드(에너지·나트륨·당류)</th><th>대표 지정</th></tr>
 ${PRODUCTS.clusters.slice(0,150).map(c=>{const rep=pdupRep[c.norm];
  return `<tr><td><b>${c.norm}</b><div class="muted small">${c.items.length}개 코드</div></td>
  <td>${c.items.map(it=>`<span class="chip" style="${rep===it[0]?'background:var(--pri);color:#fff':''}">${it[1]} · ${fmt(it[2])}kcal/${fmt(it[3])}mg/${fmt(it[4])}g</span>`).join(' ')}</td>
  <td><select onchange="pdupRep['${c.norm}']=this.value;render()"><option value="">미지정</option>${c.items.map(it=>`<option value="${it[0]}" ${rep===it[0]?'selected':''}>${it[1]} (${it[0]})</option>`).join('')}</select></td></tr>`}).join('')}</table>
 <div class="note">지정 완료 ${Object.keys(pdupRep).length} / ${PRODUCTS.clusters.length} 군집. 실제 병합은 원본 불변 원칙 하에 매핑 테이블로 반영됩니다.</div></div>`;
}
