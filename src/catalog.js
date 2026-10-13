export function safeUrl(value, image = false) {
  if (value === '') return true;
  if (image && /^assets\/[\w/.-]+$/.test(value) && !value.includes('..')) return true;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export const PROJECT_STATUSES = {development:'개발 중',active:'운영 중',maintenance:'점검 중',archived:'보관'};
export function validateCatalog(data) {
  const fail = message => { throw new Error(message); };
  const keys = (obj, allowed) => { if (!obj || typeof obj !== 'object' || Array.isArray(obj) || Object.keys(obj).some(k => !allowed.includes(k))) fail('알 수 없는 필드 또는 잘못된 객체가 있습니다. 비공개 메모를 포함하지 마세요.'); };
  keys(data, ['version','projects','presets']);
  if (![1,2].includes(data.version) || !Array.isArray(data.projects) || !Array.isArray(data.presets)) fail('지원하는 version(1 또는 2)과 projects/presets 배열이 필요합니다.');
  const ids = new Set();
  for (const p of data.projects) {
    keys(p, ['id','name','description','image','url','tags','student','teacher','hidden','usage',...(data.version === 2 ? ['repositoryUrl','status'] : [])]);
    if (data.version === 2 && (typeof p.repositoryUrl !== 'string' || !safeUrl(p.repositoryUrl) || (p.repositoryUrl && !/^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/.test(p.repositoryUrl)) || typeof p.status !== 'string' || !Object.hasOwn(PROJECT_STATUSES,p.status))) fail('GitHub 저장소 주소와 프로젝트 상태를 확인하세요.');
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
  return data;
}
export function parseCatalog(text) {
  const data = validateCatalog(JSON.parse(text.replace(/^\uFEFF/,'')));
  if (data.version === 2) return data;
  return validateCatalog({...data,version:2,projects:data.projects.map(p=>({...p,repositoryUrl:'',status:'development'}))});
}
export function serializeCatalog(data) {
  return JSON.stringify(parseCatalog(JSON.stringify(data)),null,2)+'\n';
}
export function selectProjects(data, view, presetId, query = '', tag = '') {
  let list = view === 'presentation' ? (data.presets.find(p => p.id === presetId)?.projectIds || []).map(id => data.projects.find(p => p.id === id)).filter(Boolean) : data.projects;
  return list.filter(p => (view === 'admin' || (!p.hidden && (view === 'presentation' || p[view] === true))) && (!tag || p.tags.includes(tag)) && `${p.name} ${p.description} ${p.tags.join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
}
