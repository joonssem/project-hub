import {validateCatalog, selectProjects} from './catalog.js';
import {parseCatalog, serializeCatalog, PROJECT_STATUSES, RESOURCE_SOURCES, selectStudentHome, koreaDate} from './catalog.js';
import {featureMarkup, editStudentHome} from './home.js';
const $ = id => document.getElementById(id);
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params = new URLSearchParams(location.search);
const view = ['student','teacher','presentation','admin'].includes(params.get('view')) ? params.get('view') : 'student';
let data, previousCatalog, dirty = false;
function applyCatalog(next) { const validated = validateCatalog(next); previousCatalog = structuredClone(data); data = validated; changed(); $('restore').disabled = false; }
const titles = {student:['함께 배우고, 즐기는 공간','게임과 수업 자료를 한곳에서 만나보세요.'],teacher:['좋은 수업의 경험을 나누세요','함께 쓸 자료와 프로젝트, 수업 활용 사례를 모았습니다.'],presentation:['오늘 소개할 프로젝트','선택한 프로젝트를 순서대로 만나보세요.'],admin:['프로젝트 관리','공개 정보를 정리하고, 이용자에게 필요한 프로젝트를 보여주세요.']};
$('title').textContent = titles[view][0]; $('subtitle').textContent = titles[view][1];
document.querySelector(`[data-view="${view}"]`).setAttribute('aria-current','page');
function changed() { dirty = true; $('notice').textContent = '변경사항이 탭에 적용되었습니다. JSON을 내보내고 data/projects.json을 교체해야 저장됩니다.'; refresh(); }
function refresh() {
  const selected = $('preset').value || params.get('preset');
  $('preset').innerHTML = data.presets.map(p => `<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('');
  if (data.presets.some(p => p.id === selected)) $('preset').value = selected;
  if (view === 'presentation') {
    const url = new URL(location.href);
    if ($('preset').value) url.searchParams.set('preset',$('preset').value);
    else url.searchParams.delete('preset');
    history.replaceState(null,'',url);
  }
  const tag = $('tag').value;
  const visible = selectProjects(data,view,$('preset').value);
  $('tag').innerHTML = '<option value="">모든 태그</option>' + [...new Set(visible.flatMap(p => p.tags))].sort().map(t => `<option>${escape(t)}</option>`).join('');
  if ([...$('tag').options].some(o => o.value === tag)) $('tag').value = tag;
  render();
}
function render() {
  if (!data) return;
  let list = selectProjects(data,view,$('preset').value,$('search').value,$('tag').value);
  if(view === 'admin') {
    const source = $('source-filter').value, visibility = $('visibility-filter').value;
    list = list.filter(p=>(!source || p.source===source) && (!visibility || (visibility==='shown' ? p.student && !p.hidden : !p.student || p.hidden)));
    renderAdminTable(list);
    updateStudentPreview();
  }
  const home = selectStudentHome(data);
  $('student-home').innerHTML = view === 'student' ? featureMarkup(data) : '';
  const showLibrary = view !== 'student' || home.showLibrary;
  $('cards').hidden = !showLibrary || view === 'admin';
  document.querySelector('.toolbar').hidden = !showLibrary;
  document.querySelector('.list-heading').hidden = !showLibrary;
  $('count').textContent = `${list.length}개의 자료`;
  if (view === 'presentation') { const p = data.presets.find(p => p.id === $('preset').value); $('title').textContent = p?.name || titles[view][0]; $('subtitle').textContent = p ? p.description : '관리자에서 프리셋을 등록하세요.'; }
  const filtered = $('search').value.trim() || $('tag').value;
  const emptyMessage = filtered ? '검색 조건에 맞는 프로젝트가 없습니다.' : view === 'presentation' ? '이 프리셋에 표시할 프로젝트가 없습니다.' : '아직 공개된 프로젝트가 없습니다.';
  $('cards').innerHTML = list.map((p,i) => `<article class="card"><div class="cover tone-${i%3}">${p.image ? `<img src="${escape(p.image)}" alt="${escape(p.name)} 대표 이미지" loading="lazy">` : `<span class="cover-symbol" aria-hidden="true">${['◈','▦','✳'][i%3]}</span><span class="cover-label">${escape(p.tags[0] || 'PROJECT')}</span>`}</div><div class="card-body"><div class="tags"><span class="project-status">${escape(PROJECT_STATUSES[p.status])}</span>${p.tags.map(t => `<span>${escape(t)}</span>`).join('')}</div><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p>${view === 'teacher' && p.usage ? `<details><summary>활용 안내·사례 보기</summary><p>${escape(p.usage)}</p></details>` : ''}${view !== 'student' && p.repositoryUrl ? `<a class="repository-link" href="${escape(p.repositoryUrl)}" target="_blank" rel="noopener noreferrer">GitHub 저장소 ↗</a>` : ''}${view === 'admin' ? `<p class="visibility">${p.hidden ? '숨김' : '표시'} · 학생 ${p.student ? '공개' : '미공개'} · 교사 ${p.teacher ? '공개' : '미공개'}</p><button data-edit="${escape(p.id)}">프로젝트 수정</button>` : p.url ? `<a class="launch" href="${escape(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(p.name)} 실행 (새 탭)">프로젝트 실행 <span aria-hidden="true">↗</span></a>` : '<span class="disabled">실행 주소 등록 예정</span>'}</div></article>`).join('') || `<div class="empty"><p>${emptyMessage}</p>${filtered ? '<button id="clear-filters">검색 조건 지우기</button>' : ''}</div>`;
  if ($('clear-filters')) $('clear-filters').onclick = () => { $('search').value = ''; $('tag').value = ''; render(); $('search').focus(); };
  $('cards').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editProject(b.dataset.edit));
  $('cards').querySelectorAll('img').forEach(img => img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'),{className:'cover-symbol',textContent:'◈'})); });
  installImageFallbacks($('student-home'));
}
function installImageFallbacks(root) {
  root.querySelectorAll('img').forEach(img=>img.onerror=()=>{
    img.replaceWith(Object.assign(document.createElement('span'),{className:'feature-placeholder',textContent:'◈'}));
  });
}
function renderAdminTable(list) {
  $('resource-library').hidden = false;
  $('resource-library').innerHTML = `<div class="table-scroll"><table class="resource-table"><caption class="sr-only">전체 자료 보관함과 학생 표시 설정</caption><thead><tr><th scope="col">자료</th><th scope="col">출처 · 제작자</th><th scope="col">분류</th><th scope="col">학생 목록</th><th scope="col">관리</th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>${escape(p.name)}</strong><p>${escape(p.description)}</p>${p.url ? `<a href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">자료 열기 ↗<span class="sr-only"> · ${escape(p.name)} (새 탭)</span></a>` : '<small>주소 미등록</small>'}${p.hidden ? '<small class="hidden-note">전체 화면에서 숨김 · 수정에서 해제</small>' : ''}</td><td>${escape(RESOURCE_SOURCES[p.source])}<small>${escape(p.creator || '제작·제공처 미입력')}</small></td><td>${p.tags.map(t=>`<span class="library-tag">${escape(t)}</span>`).join('')}</td><td><label class="switch"><input type="checkbox" role="switch" data-student-toggle="${escape(p.id)}" aria-label="${escape(p.name)} 학생 목록에 표시" ${p.student ? 'checked' : ''} ${p.hidden ? 'disabled' : ''}><span aria-hidden="true"></span><small>${p.hidden ? '숨김 중' : p.student ? '표시' : '보관만'}</small></label></td><td><button data-resource-edit="${escape(p.id)}" aria-label="${escape(p.name)} 수정">수정</button></td></tr>`).join('') || '<tr><td colspan="5">조건에 맞는 자료가 없습니다. 검색·태그·출처·표시 필터를 확인하세요.</td></tr>'}</tbody></table></div>`;
  $('resource-library').querySelectorAll('[data-resource-edit]').forEach(b=>b.onclick=()=>editProject(b.dataset.resourceEdit));
  $('resource-library').querySelectorAll('[data-student-toggle]').forEach(input=>input.onchange=()=>{
    const id = input.dataset.studentToggle;
    const copy = structuredClone(data);copy.projects.find(p=>p.id===id).student=input.checked;
    applyCatalog(copy);
    $('resource-library').querySelector(`[data-student-toggle="${id}"]`)?.focus();
  });
}
function updateStudentPreview() {
  if ($('student-preview').hidden) return;
  const date = $('preview-date').value || koreaDate();
  const home = selectStudentHome(data,date);
  const list = selectProjects(data,'student');
  $('preview-content').innerHTML = `<p class="muted">${escape(date)} · ${home.feature ? escape(home.feature.title) : '기본 학생 화면'} · 현재 탭의 편집 내용</p>${featureMarkup(data,date)}${home.showLibrary ? `<h3>학생 자료 목록</h3><div class="cards">${list.map(p=>`<article class="card"><div class="cover">${p.image ? `<img src="${escape(p.image)}" alt="">` : '<span class="cover-symbol" aria-hidden="true">◈</span>'}</div><div class="card-body"><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p>${p.url ? `<a class="launch" href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">자료 열기 ↗<span class="sr-only"> · ${escape(p.name)} (새 탭)</span></a>` : '<span class="disabled">실행 주소 등록 예정</span>'}</div></article>`).join('') || '<p>표시할 자료가 없습니다.</p>'}</div>` : ''}`;
  installImageFallbacks($('preview-content'));
}
function openEditor(html) { $('editor').hidden = false; $('editor').innerHTML = html; $('editor').scrollIntoView({behavior:'smooth'}); $('editor').querySelector('input,textarea,select')?.focus(); $('cancel').onclick = () => { $('editor').hidden = true; }; }
function editProject(id) {
  let resourceNumber=1;while(data.projects.some(p=>p.id==='resource-'+resourceNumber))resourceNumber++;
  const p = data.projects.find(p => p.id === id) || {id:'resource-'+resourceNumber,name:'',description:'',image:'',url:'',repositoryUrl:'',status:'active',source:'web',creator:'',tags:[],usage:'',student:false,teacher:false,hidden:false};
  openEditor(`<h2>${id ? '자료 수정' : '자료 보관함에 추가'}</h2><p>먼저 자료를 보관하고, 학생에게 보여줄 준비가 되면 학생 표시를 켜세요.</p><form id="project-form"><div class="fields">${[['name','자료 이름'],['url','자료 실행 링크'],['creator','제작자·제공처 (공개 표시)'],['repositoryUrl','GitHub 저장소 주소 (선택 · 공개 저장소만)'],['image','썸네일 이미지 주소 (선택)'],['tags','태그 (쉼표로 구분)']].map(([k,label]) => `<label>${label}<input name="${k}" value="${escape(k === 'tags' ? p.tags.join(', ') : p[k])}" ${['id','name'].includes(k) ? 'required' : ''} ${k === 'id' && id ? 'readonly' : ''}></label>`).join('')}<label>자료 출처<select name="source">${Object.entries(RESOURCE_SOURCES).map(([value,label])=>`<option value="${value}" ${p.source===value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>프로젝트 상태<select name="status">${Object.entries(PROJECT_STATUSES).map(([value,label])=>`<option value="${value}" ${p.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>설명<textarea name="description">${escape(p.description)}</textarea></label><label>공개 활용 안내·사례<textarea name="usage">${escape(p.usage)}</textarea></label></div><div class="checks">${[['student','학생 목록에 표시'],['teacher','교사 목록에 표시'],['hidden','전체 화면에서 숨김']].map(([k,label]) => `<label><input type="checkbox" name="${k}" ${p[k] ? 'checked' : ''}>${label}</label>`).join('')}</div><p>보관 자료도 공개 JSON에 포함됩니다. 비공개 메모를 입력하지 마세요.</p><p id="form-error" role="alert"></p><button class="primary">탭에 적용</button> <button type="button" id="cancel">닫기</button></form>`);
  $('project-form').onsubmit = event => { event.preventDefault(); const f = new FormData(event.target); const next = {id:p.id,name:f.get('name').trim(),url:f.get('url').trim(),image:f.get('image').trim(),repositoryUrl:f.get('repositoryUrl').trim(),status:f.get('status'),source:f.get('source'),creator:f.get('creator').trim(),tags:[...new Set(f.get('tags').split(',').map(t => t.trim()).filter(Boolean))],description:f.get('description').trim(),usage:f.get('usage').trim(),student:f.has('student'),teacher:f.has('teacher'),hidden:f.has('hidden')}; const copy = structuredClone(data); if (id) copy.projects[copy.projects.findIndex(p => p.id === id)] = next; else copy.projects.push(next); try { applyCatalog(copy); $('editor').hidden = true; } catch(e) { $('form-error').textContent = e.message; } };
}
function editPresets() {
  const draft = structuredClone(data.presets);
  let current = draft.length ? 0 : -1;
  openEditor('<h2>발표 프리셋 편집</h2><p>소개할 프로젝트를 선택하고 위·아래 버튼으로 순서를 정하세요. 학생·교사 표시 설정과 별도로 공개 발표 목록을 구성합니다. 숨김 프로젝트는 발표에서도 제외됩니다.</p><div class="preset-tools"><label>편집할 프리셋<select id="editing-preset"></select></label><button id="new-preset" type="button">+ 프리셋 추가</button><button id="remove-preset" type="button">이 프리셋 삭제</button></div><form id="preset-form"><div id="preset-fields"></div><p id="form-error" role="alert"></p><div class="actions"><button class="primary">탭에 적용</button><button type="button" id="cancel">닫기</button></div></form>');
  function updatePicker() {
    $('editing-preset').innerHTML = draft.map((p,i) => `<option value="${i}">${escape(p.name || '이름 없는 프리셋')}</option>`).join('');
    if (current >= 0) $('editing-preset').value = String(current);
    $('editing-preset').disabled = !draft.length;
    $('remove-preset').disabled = !draft.length;
  }
  function drawProjects(focusId) {
    const p = draft[current];
    if (!p) return;
    const remaining = data.projects.filter(project => !p.projectIds.includes(project.id));
    $('preset-projects').innerHTML = `<h3>발표 순서</h3>${p.projectIds.length ? '<ol class="preset-order">'+p.projectIds.map((id,i) => {
      const project = data.projects.find(project => project.id === id);
      return `<li><span>${escape(project.name)}${project.hidden ? ' <small>숨김 · 발표에서 제외</small>' : ''}</span><div class="order-actions"><button id="move-up-${i}" type="button" data-move="${i}" data-direction="-1" aria-label="${escape(project.name)} 위로" ${i === 0 ? 'disabled' : ''}>↑</button><button id="move-down-${i}" type="button" data-move="${i}" data-direction="1" aria-label="${escape(project.name)} 아래로" ${i === p.projectIds.length-1 ? 'disabled' : ''}>↓</button><button type="button" data-remove="${i}" aria-label="${escape(project.name)} 발표 목록에서 제외">제외</button></div></li>`;
    }).join('')+'</ol>' : '<p class="muted">선택된 프로젝트가 없습니다.</p>'}<label>추가할 프로젝트<select id="add-project">${remaining.length ? remaining.map(project => `<option value="${escape(project.id)}">${escape(project.name)}${project.hidden ? ' (숨김)' : ''}</option>`).join('') : '<option value="">모든 프로젝트를 선택했습니다</option>'}</select></label><button id="include-project" type="button" ${remaining.length ? '' : 'disabled'}>발표 목록에 추가</button><div class="preset-preview"><strong>방문자에게 보이는 순서</strong><p>${p.projectIds.map(id => data.projects.find(project => project.id === id)).filter(project => !project.hidden).map(project => escape(project.name)).join(' → ') || '표시할 프로젝트가 없습니다.'}</p></div>`;
    $('include-project').onclick = () => { const id = $('add-project').value; if (id && !p.projectIds.includes(id)) { p.projectIds.push(id); drawProjects('add-project'); } };
    $('preset-projects').querySelectorAll('[data-remove]').forEach(button => button.onclick = () => { p.projectIds.splice(Number(button.dataset.remove),1); drawProjects('add-project'); });
    $('preset-projects').querySelectorAll('[data-move]').forEach(button => button.onclick = () => {
      const from = Number(button.dataset.move), direction = Number(button.dataset.direction), to = from + direction;
      if (to < 0 || to >= p.projectIds.length) return;
      [p.projectIds[from],p.projectIds[to]] = [p.projectIds[to],p.projectIds[from]];
      drawProjects(`move-${direction === -1 ? 'down' : 'up'}-${to}`);
    });
    if (focusId) $(focusId)?.focus();
  }
  function drawFields() {
    updatePicker();
    const p = draft[current];
    $('preset-fields').innerHTML = p ? `<div class="fields"><label>프리셋 ID<input id="editing-preset-id" value="${escape(p.id)}" required pattern="[a-z0-9-]+" aria-describedby="preset-id-help"><small id="preset-id-help">공유 주소에 사용합니다. 영문 소문자·숫자·하이픈을 입력하세요.</small></label><label>프리셋 이름<input id="editing-preset-name" value="${escape(p.name)}" required></label><label class="full-field">발표 소개<textarea id="editing-preset-description">${escape(p.description)}</textarea></label></div><div id="preset-projects"></div>` : '<p>등록된 프리셋이 없습니다. 추가 버튼으로 새 발표 목록을 만드세요.</p>';
    if (p) {
      for (const key of ['id','name','description']) $('editing-preset-'+key).oninput = e => { p[key] = e.target.value; if(key === 'name') $('editing-preset').selectedOptions[0].textContent = p.name || '이름 없는 프리셋'; };
      drawProjects();
    }
    $('form-error').textContent = '';
  }
  $('editing-preset').onchange = e => { current = Number(e.target.value); drawFields(); };
  $('new-preset').onclick = () => { let n=1; while(draft.some(p=>p.id === `presentation-${n}`)) n++; draft.push({id:`presentation-${n}`,name:'새 발표',description:'',projectIds:[]}); current = draft.length-1; drawFields(); $('editing-preset-name').focus(); };
  $('remove-preset').onclick = () => { draft.splice(current,1); current = draft.length ? Math.min(current,draft.length-1) : -1; drawFields(); };
  $('preset-form').onsubmit = e => { e.preventDefault(); try { const presets = draft.map(p=>({...p,id:p.id.trim(),name:p.name.trim(),description:p.description.trim()})); const next = validateCatalog({...data,presets}); applyCatalog(next); $('editor').hidden = true; } catch(e) { $('form-error').textContent = e.message; } };
  drawFields();
}
async function init() {
  $('retry').hidden = true;
  $('notice').textContent = '프로젝트를 불러오는 중입니다…';
  $('cards').setAttribute('aria-busy','true');
  for (const id of ['search','tag','preset']) $(id).disabled = true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),10000);
    let response;
    try { response = await fetch(new URL('../data/projects.json',import.meta.url),{signal:controller.signal,cache:'no-store'}); } finally { clearTimeout(timer); }
    if (!response.ok) throw new Error('프로젝트 파일을 불러오지 못했습니다.');
    data = parseCatalog(await response.text());
  } catch(e) {
    $('notice').textContent = `프로젝트를 불러오지 못했습니다. ${e.name === 'AbortError' ? '연결 시간이 초과되었습니다.' : e.message}`;
    $('count').textContent = '불러오기 실패';
    $('retry').hidden = false;
    return;
  } finally { $('cards').setAttribute('aria-busy','false'); }
  $('notice').textContent = '';
  for (const id of ['search','tag','preset']) $(id).disabled = false;
  $('preset-label').hidden = view !== 'presentation';
  if (view === 'admin') {
    $('admin-tools').hidden = false;
    $('title').textContent = '자료 보관함';
    $('subtitle').textContent = '내가 만든 자료부터 다른 교사의 웹앱까지 모으고, 학생에게 보여줄 화면을 구성하세요.';
    $('list-title').textContent = '전체 자료';
    $('admin-tools').innerHTML = '<div class="warning"><strong>로컬 편집 도구 · 인증 없음</strong><p>숨김은 접근 차단이 아닙니다. 변경 후 JSON을 내보내 원본 파일을 교체하세요. 새로고침하면 미저장 변경이 사라집니다.</p></div><div class="actions"><button class="primary" id="add">+ 자료 수집</button><button id="student-home-edit">학생 홈 구성</button><button id="preview-student">학생 화면 미리보기</button><button id="presets">연수 프리셋 편집</button><button id="export">JSON 내보내기</button><button id="restore" disabled>직전 목록 복원</button><button id="paste-import">JSON 붙여넣기</button><label class="file-button">JSON 가져오기<input id="import" type="file" accept=".json,application/json"></label></div>';
    $('source-label').hidden = false;$('visibility-label').hidden = false;
    $('source-filter').innerHTML = '<option value="">모든 출처</option>'+Object.entries(RESOURCE_SOURCES).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
    $('source-filter').onchange=render;$('visibility-filter').onchange=render;
    $('student-home-edit').onclick=()=>editStudentHome(data,next=>applyCatalog({...data,studentHome:next.studentHome}),openEditor);
    $('preview-date').value=koreaDate();$('preview-date').onchange=updateStudentPreview;
    $('preview-student').onclick=()=>{$('student-preview').hidden=false;updateStudentPreview();$('student-preview').scrollIntoView({behavior:'smooth'});$('preview-date').focus();};
    $('close-preview').onclick=()=>{$('student-preview').hidden=true;$('preview-student').focus();};
    $('restore').onclick = () => { if (previousCatalog) { applyCatalog(structuredClone(previousCatalog)); $('editor').hidden = true; $('notice').textContent = '직전 목록을 복원했습니다. 저장하려면 JSON을 내보내 원본을 교체하세요.'; } };
    $('add').onclick = () => editProject(); $('presets').onclick = editPresets;
    $('export').onclick = () => {
      const text = serializeCatalog(data);
      openEditor('<h2>JSON 내보내기</h2><p>파일을 내려받거나 아래 내용을 복사해 data/projects.json을 교체하세요. 검사·재빌드·배포 후 방문자에게 반영됩니다.</p><label>내보낼 프로젝트 JSON<textarea id="export-json" rows="14" readonly spellcheck="false"></textarea></label><div class="actions"><button id="download-json">파일 다운로드</button><button id="select-json">전체 선택</button><button id="cancel">닫기</button></div><p id="download-status" role="status"></p>');
      $('export-json').value = text;
      $('select-json').onclick = () => { $('export-json').focus(); $('export-json').select(); };
      $('download-json').onclick = () => { const url = URL.createObjectURL(new Blob([text],{type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'projects.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),10000); $('download-status').textContent = '다운로드를 요청했습니다. 내려받은 파일을 확인하세요. 다운로드가 되지 않으면 전체 선택 후 복사할 수 있습니다.'; };
    };
    $('import').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { importCatalog(await file.text()); } catch(e) { $('notice').textContent = `가져오기 실패: ${e.message}`; } e.target.value = ''; };
    $('paste-import').onclick = () => {
      openEditor('<h2>JSON 붙여넣기</h2><p>가져온 내용으로 현재 탭의 목록과 프리셋을 대체합니다. 비공개 정보는 넣지 마세요.</p><form id="paste-form"><label>프로젝트 JSON<textarea id="import-json" rows="14" required spellcheck="false"></textarea></label><p id="form-error" role="alert"></p><button class="primary">JSON 가져와 적용</button> <button type="button" id="cancel">닫기</button></form>');
      $('paste-form').onsubmit = e => { e.preventDefault(); try { importCatalog($('import-json').value); } catch(e) { $('form-error').textContent = `가져오기 실패: ${e.message}`; } };
    };
  }
  refresh();
}
function importCatalog(text) {
  const next = parseCatalog(text);
  if (dirty && !confirm('현재 탭의 변경을 가져온 JSON으로 대체할까요?')) return;
  applyCatalog(next);
  $('editor').hidden = true;
}
$('search').oninput = render; $('tag').onchange = render;
$('retry').onclick = init;
$('preset').onchange = () => { const url = new URL(location.href); url.searchParams.set('preset',$('preset').value); history.replaceState(null,'',url); refresh(); };
window.addEventListener('beforeunload',e => { if(dirty) {e.preventDefault(); e.returnValue = '';}});
// Re-evaluate scheduled features when an open classroom tab crosses midnight.
if(view === 'student') {
  let displayedDate = koreaDate();
  const checkDate = () => { const today=koreaDate();if(data && today!==displayedDate){displayedDate=today;render();} };
  setInterval(checkDate,30000);
  document.addEventListener('visibilitychange',checkDate);
}
init();
