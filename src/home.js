import {selectStudentHome, koreaDate} from './catalog.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function featureMarkup(data, date = koreaDate()) {
  const {feature,projects} = selectStudentHome(data,date);
  if (!feature) return '';
  return `<section class="student-feature" aria-label="이번 주 주제"><div class="feature-intro"><div><p class="eyebrow">이번 주, 함께 배워요</p><h2>${escape(feature.title)}</h2><p>${escape(feature.description)}</p></div>${feature.image ? `<img src="${escape(feature.image)}" alt="${escape(feature.title)} 대표 이미지">` : '<span class="feature-symbol" aria-hidden="true">✳</span>'}</div><div class="feature-links">${projects.map(p=>`<article class="feature-resource">${p.image ? `<img src="${escape(p.image)}" alt="" loading="lazy">` : '<span class="feature-placeholder" aria-hidden="true">◈</span>'}<div><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p>${p.creator ? `<small>제작·제공: ${escape(p.creator)}</small>` : ''}${p.url ? `<a class="launch" href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">자료 열기 ↗<span class="sr-only"> · ${escape(p.name)} (새 탭)</span></a>` : '<span class="disabled">실행 주소 등록 예정</span>'}</div></article>`).join('')}</div></section>`;
}

export function editStudentHome(data, apply, openEditor) {
  const draft = structuredClone(data.studentHome);
  let current = draft.features.length ? 0 : -1;
  openEditor(`<h2>학생 홈 구성</h2><p>자료를 모아 주제 특집을 만들고 게시 기간을 정하세요. 날짜는 한국 시간 기준이며 시작일·종료일을 포함합니다. 날짜를 비우면 해당 방향으로 기간 제한이 없습니다.</p><label class="toggle-line"><input id="show-library" type="checkbox" ${draft.showLibrary ? 'checked' : ''}> 특집 아래에 일반 학생 자료 목록도 표시</label><p class="muted">특집이 없거나 끝나면 일반 학생 자료 목록으로 돌아갑니다. 기간이 겹치면 아래 목록에서 위에 있는 특집 하나가 표시됩니다. 학생 표시가 꺼져 있거나 숨긴 자료는 특집에서도 제외됩니다.</p><div class="preset-tools"><label>편집할 특집<select id="editing-feature"></select></label><button type="button" id="new-feature">+ 주제 특집 추가</button><button type="button" id="delete-feature">특집 삭제</button><button type="button" id="feature-up">우선순위 ↑</button><button type="button" id="feature-down">우선순위 ↓</button></div><form id="home-form"><div id="feature-fields"></div><p id="form-error" role="alert"></p><div class="actions"><button class="primary">탭에 적용</button><button type="button" id="cancel">닫기</button></div></form>`);
  $('show-library').onchange = e => draft.showLibrary = e.target.checked;

  function drawSelection(focusId) {
    const f = draft.features[current];
    const remaining = data.projects.filter(p=>!f.projectIds.includes(p.id));
    $('feature-selection').innerHTML = `<h3>상단에 소개할 자료와 순서</h3>${f.projectIds.length ? `<ol class="preset-order">${f.projectIds.map((id,i)=> {
      const p = data.projects.find(p=>p.id === id);
      return `<li><span>${escape(p.name)}${!p.student || p.hidden ? '<small>학생 화면에서 제외됨 · 자료 목록에서 학생 표시를 켜고 숨김을 해제하세요.</small>' : ''}</span><div class="order-actions"><button type="button" data-feature-move="${i}" data-step="-1" aria-label="${escape(p.name)} 위로" ${i===0 ? 'disabled' : ''}>↑</button><button type="button" data-feature-move="${i}" data-step="1" aria-label="${escape(p.name)} 아래로" ${i===f.projectIds.length-1 ? 'disabled' : ''}>↓</button><button type="button" data-feature-remove="${i}" aria-label="${escape(p.name)} 특집에서 제외">제외</button></div></li>`;
    }).join('')}</ol>` : '<p class="muted">자료를 추가하세요. 표시 가능한 자료가 없는 특집은 학생 화면에 나오지 않습니다.</p>'}<label>추가할 자료 검색<input id="feature-resource-search" type="search" placeholder="자료명·태그·제작자로 찾기"></label><label>추가할 자료<select id="feature-resource"></select></label><button id="feature-include" type="button">특집에 추가</button>`;
    function filterResources() {
      const query = $('feature-resource-search').value.trim().toLocaleLowerCase();
      const matches = remaining.filter(p=>`${p.name} ${p.tags.join(' ')} ${p.creator}`.toLocaleLowerCase().includes(query));
      $('feature-resource').innerHTML = matches.length ? matches.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}${!p.student || p.hidden ? ' (학생 화면에서 제외됨)' : ''}</option>`).join('') : '<option value="">해당하는 자료가 없습니다</option>';
      $('feature-include').disabled = !matches.length;
    }
    $('feature-resource-search').oninput = filterResources;
    filterResources();
    $('feature-include').onclick = () => { const id = $('feature-resource').value; if (id && !f.projectIds.includes(id)) { f.projectIds.push(id); drawSelection('feature-resource-search'); } };
    $('feature-selection').querySelectorAll('[data-feature-remove]').forEach(b=>b.onclick=()=>{f.projectIds.splice(Number(b.dataset.featureRemove),1);drawSelection('feature-resource-search');});
    $('feature-selection').querySelectorAll('[data-feature-move]').forEach(b=>b.onclick=()=>{
      const from = Number(b.dataset.featureMove), to = from + Number(b.dataset.step);
      if (to < 0 || to >= f.projectIds.length) return;
      [f.projectIds[from],f.projectIds[to]] = [f.projectIds[to],f.projectIds[from]];
      drawSelection();
      $('feature-selection').querySelector(`[data-feature-move="${to}"][data-step="${-Number(b.dataset.step)}"]`)?.focus();
    });
    if(focusId) $(focusId)?.focus();
  }
  function draw() {
    $('editing-feature').innerHTML = draft.features.map((f,i)=>`<option value="${i}">${i+1}. ${escape(f.title || '이름 없는 특집')}${f.enabled ? '' : ' (사용 안 함)'}</option>`).join('');
    $('editing-feature').disabled = current < 0;
    if(current >= 0) $('editing-feature').value = String(current);
    $('delete-feature').disabled = current < 0;
    $('feature-up').disabled = current <= 0;
    $('feature-down').disabled = current < 0 || current === draft.features.length-1;
    const f = draft.features[current];
    $('feature-fields').innerHTML = f ? `<div class="fields"><label>특집 제목<input name="title" value="${escape(f.title)}" required></label><label>대표 이미지 주소<input name="image" value="${escape(f.image)}" placeholder="선택 · 이미지가 없으면 기본 장식 표시"></label><label>게시 시작일<input name="startDate" type="date" value="${escape(f.startDate)}"></label><label>게시 종료일<input name="endDate" type="date" value="${escape(f.endDate)}"></label><label class="full-field">특집 소개<textarea name="description">${escape(f.description)}</textarea></label></div><label class="toggle-line"><input name="enabled" type="checkbox" ${f.enabled ? 'checked' : ''}> 이 특집 사용</label><div id="feature-selection"></div>` : '<p>주제 특집을 추가하세요. 특집이 없으면 일반 학생 화면을 사용합니다.</p>';
    if(f) {
      for (const name of ['title','image','startDate','endDate','description','enabled']) {
        const input = $('home-form').elements.namedItem(name);
        input.oninput = () => {
          f[name] = name === 'enabled' ? input.checked : input.value;
          $('editing-feature').selectedOptions[0].textContent = `${current+1}. ${f.title || '이름 없는 특집'}${f.enabled ? '' : ' (사용 안 함)'}`;
        };
      }
      drawSelection();
    }
    $('form-error').textContent = '';
  }
  $('editing-feature').onchange = e=>{current=Number(e.target.value);draw();};
  $('new-feature').onclick = ()=>{
    let n=1;while(draft.features.some(f=>f.id===`feature-${n}`))n++;
    draft.features.push({id:`feature-${n}`,title:'새 주제 특집',description:'',image:'',enabled:false,startDate:'',endDate:'',projectIds:[]});
    current=draft.features.length-1;draw();$('home-form').elements.namedItem('title').focus();
  };
  $('delete-feature').onclick=()=>{draft.features.splice(current,1);current=draft.features.length ? Math.min(current,draft.features.length-1) : -1;draw();};
  for(const [id,step] of [['feature-up',-1],['feature-down',1]]) $(id).onclick=()=>{
    const to=current+step;if(to<0 || to>=draft.features.length)return;
    [draft.features[current],draft.features[to]]=[draft.features[to],draft.features[current]];current=to;draw();
  };
  $('home-form').onsubmit=e=>{
    e.preventDefault();
    try {
      const studentHome = {...draft,features:draft.features.map(f=>({...f,title:f.title.trim(),image:f.image.trim(),description:f.description.trim()}))};
      apply({...data,studentHome});$('editor').hidden=true;
    } catch(error) { $('form-error').textContent=error.message; }
  };
  draw();
}
