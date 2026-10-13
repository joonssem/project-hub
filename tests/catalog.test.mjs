import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalog,selectProjects,parseCatalog,serializeCatalog} from '../src/catalog.js';
const original = JSON.parse(await readFile(new URL('./fixtures/catalog.json',import.meta.url),'utf8'));
test('공개 JSON 데이터 계약',async () => {
  const production = JSON.parse(await readFile(new URL('../data/projects.json',import.meta.url),'utf8'));
  assert.equal(validateCatalog(production),production);
});
test('공개 대상, 숨김, 관리자와 발표 순서',() => {
  const d = structuredClone(original); d.projects[0].hidden = true;
  assert.deepEqual(selectProjects(d,'student').map(p=>p.id),['lesson']);
  assert.deepEqual(selectProjects(d,'teacher').map(p=>p.id),['lesson','teacher']);
  assert.equal(selectProjects(d,'admin').length,3);
  d.presets[0].projectIds.reverse();
  assert.deepEqual(selectProjects(d,'presentation','training').map(p=>p.id),['teacher','lesson']);
});
test('검색과 태그, 없는 프리셋',()=>{
  assert.equal(selectProjects(original,'student',null,'협동','게임').length,1);
  assert.equal(selectProjects(original,'presentation','unknown').length,0);
});
test('비공개 필드, 위험한 URL, 중복과 깨진 참조를 거부',()=>{
  for (const mutate of [d=>d.projects[0].privateNotes='secret',d=>d.projects[0].url='javascript:alert(1)',d=>d.projects[0].image='assets/../secret',d=>d.projects[1].id=d.projects[0].id,d=>d.presets[0].projectIds.push('missing')]) { const d=structuredClone(original);mutate(d);assert.throws(()=>validateCatalog(d)); }
});
test('version 1 이전: 기존 값·선정 순서를 보존하고 새 필드만 추가',()=>{
  const before=structuredClone(original);
  const migrated=parseCatalog(JSON.stringify(original));
  assert.equal(migrated.version,2);
  assert.deepEqual(migrated.presets,original.presets);
  migrated.projects.forEach((p,i)=>{
    const {repositoryUrl,status,...legacy}=p;
    assert.equal(repositoryUrl,'');assert.equal(status,'development');assert.deepEqual(legacy,original.projects[i]);
  });
  assert.deepEqual(original,before);
});
test('내보내기·재가져오기와 백업 복원: 모든 필드·순서 보존',()=>{
  const d=parseCatalog(JSON.stringify(original));
  Object.assign(d.projects[0],{repositoryUrl:'https://github.com/joonssem/mini_game_platform',status:'maintenance',description:'줄바꿈\n한글과 "따옴표" <태그>',student:false,hidden:true});
  d.presets[0].projectIds.reverse();
  const backup=serializeCatalog(d);
  assert.deepEqual(parseCatalog(backup),d);
  const changed=structuredClone(d);changed.projects[0].description='changed';
  assert.deepEqual(parseCatalog(backup),d);assert.notDeepEqual(changed,d);
});
test('상태와 공개 대상은 독립적이며 프리셋은 권한 검사가 아니다',()=>{
  const d=parseCatalog(JSON.stringify(original));
  for(const status of ['development','active','maintenance','archived']) {
    d.projects[0].status=status;
    assert.equal(selectProjects(d,'student').length,2);
  }
  d.projects[0].student=false;d.projects[0].teacher=false;
  assert.equal(selectProjects(d,'student').length,1);
  assert.equal(selectProjects(d,'presentation','training').length,3);
});
test('version 2 잘못된 상태·저장소 주소·알 수 없는 버전을 거부',()=>{
  for(const mutate of [d=>d.projects[0].status='unknown',d=>d.projects[0].repositoryUrl='https://example.com/repo',d=>d.version=3]) {const d=parseCatalog(JSON.stringify(original));mutate(d);assert.throws(()=>validateCatalog(d));}
});
