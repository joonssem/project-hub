import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCatalog,selectProjects,parseCatalog,serializeCatalog,selectStudentHome,koreaDate} from '../src/catalog.js';
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
  assert.equal(migrated.version,3);
  assert.deepEqual(migrated.presets,original.presets);
  migrated.projects.forEach((p,i)=>{
    const {repositoryUrl,status,source,creator,...legacy}=p;
    assert.equal(repositoryUrl,'');assert.equal(status,'development');assert.equal(source,'unknown');assert.equal(creator,'');assert.deepEqual(legacy,original.projects[i]);
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
test('잘못된 상태·저장소 주소·알 수 없는 버전을 거부',()=>{
  for(const mutate of [d=>d.projects[0].status='unknown',d=>d.projects[0].repositoryUrl='https://example.com/repo',d=>d.version=4]) {const d=parseCatalog(JSON.stringify(original));mutate(d);assert.throws(()=>validateCatalog(d));}
});

function scheduledCatalog() {
  const d=parseCatalog(JSON.stringify(original));
  d.studentHome={showLibrary:false,features:[
    {id:'dokdo',title:'독도 교육 주간',description:'함께 알아봐요',image:'',enabled:true,startDate:'2026-10-26',endDate:'2026-11-01',projectIds:['lesson','game','teacher']},
    {id:'next',title:'다음 주 활동',description:'',image:'',enabled:true,startDate:'2026-11-02',endDate:'2026-11-08',projectIds:['game']}
  ]};
  return d;
}
test('학생 특집: 한국 날짜, 시작·종료 포함, 다음 특집 전환과 일반 화면 복귀',()=>{
  const d=scheduledCatalog();
  assert.equal(koreaDate(new Date('2026-10-25T15:00:00Z')),'2026-10-26');
  assert.equal(koreaDate(new Date('2026-10-25T14:59:59Z')),'2026-10-25');
  assert.deepEqual(selectStudentHome(d,'2026-10-25'),{feature:null,projects:[],showLibrary:true});
  for(const date of ['2026-10-26','2026-11-01']) {
    const home=selectStudentHome(d,date);
    assert.equal(home.feature.id,'dokdo');assert.equal(home.showLibrary,false);
    assert.deepEqual(home.projects.map(p=>p.id),['lesson','game']);
  }
  assert.equal(selectStudentHome(d,'2026-11-02').feature.id,'next');
  assert.equal(selectStudentHome(d,'2026-11-09').feature,null);
  assert.equal(selectStudentHome(d,'2026-11-09').showLibrary,true);
});
test('학생 표시 끄기·숨김은 특집에도 적용, 빈 특집은 건너뛰고 겹친 기간은 목록 순서로 결정',()=>{
  const d=scheduledCatalog();
  d.studentHome.features[1].startDate='2026-10-26';
  assert.equal(selectStudentHome(d,'2026-10-27').feature.id,'dokdo');
  d.studentHome.features[0].enabled=false;
  assert.equal(selectStudentHome(d,'2026-10-27').feature.id,'next');
  d.studentHome.features[0].enabled=true;
  d.projects.find(p=>p.id==='lesson').student=false;
  d.studentHome.features[0].projectIds=['lesson','teacher'];
  assert.equal(selectStudentHome(d,'2026-10-27').feature.id,'next');
  d.projects.find(p=>p.id==='game').hidden=true;
  assert.equal(selectStudentHome(d,'2026-10-27').feature,null);
});
test('상시 특집·출처 검색·v3 내보내기 보존',()=>{
  const d=scheduledCatalog();
  Object.assign(d.studentHome.features[0],{startDate:'',endDate:''});
  Object.assign(d.projects[0],{source:'teacher',creator:'테스트 교사'});
  assert.equal(selectStudentHome(d,'2027-01-01').feature.id,'dokdo');
  assert.equal(selectProjects(d,'admin',null,'테스트 교사').length,1);
  assert.deepEqual(parseCatalog(serializeCatalog(d)),d);
});
test('v2 자료·프리셋·공개 설정을 보존해 v3로 이전',()=>{
  const migrated=parseCatalog(JSON.stringify(original));
  const legacy={version:2,projects:migrated.projects.map(({source,creator,...p})=>p),presets:migrated.presets};
  const result=parseCatalog(JSON.stringify(legacy));
  assert.deepEqual(result,migrated);
});
test('잘못된 특집 기간·참조·주소·출처·추가 비공개 필드를 거부',()=>{
  for(const mutate of [
    d=>d.studentHome.features[0].endDate='2026-10-25',
    d=>d.studentHome.features[0].startDate='2026-02-30',
    d=>d.studentHome.features[0].startDate='2026-2-3',
    d=>d.studentHome.features[0].projectIds.push('missing'),
    d=>d.studentHome.features[0].projectIds.push('game'),
    d=>d.studentHome.features[0].image='javascript:alert(1)',
    d=>d.studentHome.features[0].privateNotes='secret',
    d=>d.studentHome.features[1].id='dokdo',
    d=>d.projects[0].source='untrusted',
    d=>d.studentHome.showLibrary='yes'
  ]) {const d=scheduledCatalog();mutate(d);assert.throws(()=>validateCatalog(d));}
});
