// v9: public starter templates. These are intentionally shallow/blank guides.
// Users clone a template into localStorage and fill its branches themselves.
const GUIDE_TEMPLATES=[
  {
    id:'travel',title:'여행 계획',accent:'#477a87',
    description:'여행지를 정한 뒤 일정·교통·숙소·예산·먹거리·활동을 8개 가지로 나눠 계획합니다.',
    branches:['목적지','일정','교통','숙소','예산','먹거리','활동','체크리스트']
  },
  {
    id:'shopping',title:'구매 비교',accent:'#8a6b3e',
    description:'큰돈을 쓰기 전 조건과 후보를 분리해 비교하는 보드입니다.',
    branches:['구매 목적','예산','필수 조건','후보 브랜드','후보 모델','장단점','리뷰·리스크','최종 후보']
  },
  {
    id:'project',title:'프로젝트 기획',accent:'#5d607d',
    description:'아이디어를 실행 계획으로 바꾸기 위한 기본 프로젝트 구조입니다.',
    branches:['목표','범위','작업','일정','사람·역할','자료·도구','리스크','완료 기준']
  },
  {
    id:'fitness',title:'운동 루틴',accent:'#58755f',
    description:'운동 목표부터 회복과 기록까지 한눈에 관리하는 허브입니다.',
    branches:['목표','상체','하체','유산소','코어','스트레칭','회복','기록']
  },
  {
    id:'reading',title:'독서·콘텐츠',accent:'#7a5f79',
    description:'책·영상·논문을 모으고 읽은 뒤 메모와 아이디어까지 연결합니다.',
    branches:['읽을 것','분야','진행 중','핵심 메모','인용·장면','아이디어','완료','다시 보기']
  },
  {
    id:'career',title:'진로·중요한 결정',accent:'#786642',
    description:'여러 선택지를 감정과 조건을 분리해서 비교하는 의사결정 보드입니다.',
    branches:['목표','선택지','장점','단점','요구 조건','준비할 것','리스크','다음 행동']
  },
  {
    id:'moving',title:'이사·생활 정리',accent:'#56747d',
    description:'이사, 방 구하기, 생활환경 선택처럼 조건이 많은 결정을 정리합니다.',
    branches:['지역','집 조건','예산','교통','편의시설','가구·물건','일정','체크리스트']
  },
  {
    id:'event',title:'모임·행사 준비',accent:'#8b6558',
    description:'여행 모임·생일·스터디·행사 준비를 빠뜨리지 않도록 나눕니다.',
    branches:['목적','참석자','날짜','장소','예산','프로그램','음식','준비물']
  }
];
window.NONET_GUIDE_TEMPLATES=GUIDE_TEMPLATES;
