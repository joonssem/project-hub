export function safeUrl(value, image = false) {
  if (value === '') return true;
  if (image && /^assets\/[\w/.-]+$/.test(value) && !value.includes('..')) return true;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export const PROJECT_STATUSES = {development:'개발 중',active:'운영 중',maintenance:'점검 중',archived:'보관'};
export const RESOURCE_SOURCES = {own:'내가 만든 자료',teacher:'다른 교사 자료',web:'인터넷 학습 자료',unknown:'미분류'};
export function koreaDate(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function validDate(value) {
  return value === '' || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
}
export function validateCatalog(data) {
  const fail = message => { throw new Error(message); };
  const keys = (obj, allowed) => { if (!obj || typeof obj !== 'object' || Array.isArray(obj) || Object.keys(obj).some(k => !allowed.includes(k))) fail('알 수 없는 필드 또는 잘못된 객체가 있습니다. 비공개 메모를 포함하지 마세요.'); };
  keys(data, ['version','projects','presets',...(data.version === 3 ? ['studentHome'] : [])]);
  if (![1,2,3].includes(data.version) || !Array.isArray(data.projects) || !Array.isArray(data.presets)) fail('지원하는 version(1, 2, 3)과 projects/presets 배열이 필요합니다.');
  const ids = new Set();
  for (const p of data.projects) {
    keys(p, ['id','name','description','image','url','tags','student','teacher','hidden','usage',...(data.version >= 2 ? ['repositoryUrl','status'] : []),...(data.version === 3 ? ['source','creator'] : [])]);
    if (data.version >= 2 && (typeof p.repositoryUrl !== 'string' || !safeUrl(p.repositoryUrl) || (p.repositoryUrl && !/^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/.test(p.repositoryUrl)) || typeof p.status !== 'string' || !Object.hasOwn(PROJECT_STATUSES,p.status))) fail('GitHub 저장소 주소와 프로젝트 상태를 확인하세요.');
    if (data.version === 3 && (typeof p.source !== 'string' || !Object.hasOwn(RESOURCE_SOURCES,p.source) || typeof p.creator !== 'string')) fail('자료 출처와 제작자·제공처를 확인하세요.');
    for (const k of ['id','name','description','image','url','usage']) if (typeof p[k] !== 'string') fail(`${k}는 문자열이어야 합니다.`);
    if (!/^[a-z0-9-]+$/.test(p.id) || ids.has(p.id) || !p.name.trim()) fail('프로젝트 ID는 중복 없는 영문 소문자·숫자·하이픈, 이름은 필수입니다.');
    ids.add(p.id);
    if (!safeUrl(p.url) || !safeUrl(p.image, true)) fail('링크/이미지 주소가 허용되지 않습니다. HTTP(S) 주소를 사용하세요.');
    if (!Array.isArray(p.tags) || p.tags.some(t => typeof t !== 'string' || !t.trim())) fail('태그는 비어 있지 않은 문자열 배열이어야 합니다.');
    for (const k of ['student','teacher','hidden']) if (typeof p[k] !== 'boolean') fail(`${k}는 boolean이어야 합니다.`);
  }
  const presets = new Set();
  for (const p of data.presets) {
    keys(p, ['id','name','description','projectIds']);
    if (typeof p.id !== 'string' || !/^[a-z0-9-]+$/.test(p.id) || presets.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || typeof p.description !== 'string') fail('프리셋 ID와 이름을 확인하세요.');
    presets.add(p.id);
    if (!Array.isArray(p.projectIds) || new Set(p.projectIds).size !== p.projectIds.length || p.projectIds.some(id => !ids.has(id))) fail('프리셋에 중복 또는 존재하지 않는 프로젝트가 있습니다.');
  }
  if (data.version === 3) {
    keys(data.studentHome,['showLibrary','features']);
    if (typeof data.studentHome.showLibrary !== 'boolean' || !Array.isArray(data.studentHome.features)) fail('학생 홈의 기본 목록 표시와 특집 목록을 확인하세요.');
    const features = new Set();
    for (const f of data.studentHome.features) {
      keys(f,['id','title','description','image','enabled','startDate','endDate','projectIds']);
      if (typeof f.id !== 'string' || !/^[a-z0-9-]+$/.test(f.id) || features.has(f.id) || typeof f.title !== 'string' || !f.title.trim()) fail('특집 ID와 제목을 확인하세요.');
      features.add(f.id);
      if (typeof f.description !== 'string' || typeof f.image !== 'string' || !safeUrl(f.image,true) || typeof f.enabled !== 'boolean') fail('특집 소개·이미지·사용 여부를 확인하세요.');
      if (typeof f.startDate !== 'string' || typeof f.endDate !== 'string' || !validDate(f.startDate) || !validDate(f.endDate) || (f.startDate && f.endDate && f.startDate > f.endDate)) fail('특집 게시 기간을 확인하세요. 종료일은 시작일 이후여야 합니다.');
      if (!Array.isArray(f.projectIds) || new Set(f.projectIds).size !== f.projectIds.length || f.projectIds.some(id => !ids.has(id))) fail('특집에 중복 또는 존재하지 않는 자료가 있습니다.');
    }
  }
  return data;
}
export function parseCatalog(text) {
  const data = validateCatalog(JSON.parse(text.replace(/^\uFEFF/,'')));
  if (data.version === 3) return data;
  return validateCatalog({...data,version:3,projects:data.projects.map(p=>({...p,...(data.version === 1 ? {repositoryUrl:'',status:'development'} : {}),source:'unknown',creator:''})),studentHome:{showLibrary:true,features:[]}});
}
export function serializeCatalog(data) {
  return JSON.stringify(parseCatalog(JSON.stringify(data)),null,2)+'\n';
}
export function selectProjects(data, view, presetId, query = '', tag = '') {
  let list = view === 'presentation' ? (data.presets.find(p => p.id === presetId)?.projectIds || []).map(id => data.projects.find(p => p.id === id)).filter(Boolean) : data.projects;
  return list.filter(p => (view === 'admin' || (!p.hidden && (view === 'presentation' || p[view] === true))) && (!tag || p.tags.includes(tag)) && `${p.name} ${p.description} ${p.tags.join(' ')} ${p.creator || ''} ${RESOURCE_SOURCES[p.source] || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
}
// Dates are inclusive Korean calendar dates. The first eligible feature wins.
export function selectStudentHome(data, date = koreaDate()) {
  const projects = selectProjects(data,'student');
  const available = new Map(projects.map(p=>[p.id,p]));
  for (const feature of data.studentHome?.features || []) {
    if (!feature.enabled || (feature.startDate && date < feature.startDate) || (feature.endDate && date > feature.endDate)) continue;
    const selected = feature.projectIds.map(id=>available.get(id)).filter(Boolean);
    if (selected.length) return {feature,projects:selected,showLibrary:data.studentHome.showLibrary};
  }
  return {feature:null,projects:[],showLibrary:true};
}
