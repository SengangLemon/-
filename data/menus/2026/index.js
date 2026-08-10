// Hardcoded built-in decision-board release for 2026.
// The actual tree nodes are declared in app-v6-menu.js and app-v7-menus.js.
// This file is the stable release boundary that binds those roots to metadata.
(function registerMenuRelease2026(){
  'use strict';

  registerNonetMenuYear(2026,{
    schemaVersion:1,
    release:'2026.1',
    updatedAt:'2026-08-10',
    notes:'Initial versioned release containing lunch, dinner, and dessert decision boards.',
    maps:{
      lunch:{
        title:'서울 점심 메뉴 결정판',
        short:'서울 점심',
        accent:'#b36b2f',
        description:'서울 배달·포장 이용 맥락과 공개 배달앱 주문 데이터를 반영한 확장형 점심 결정 보드.',
        root:LUNCH_ROOT_V6,
        centerMode:'weighted-random',
        version:'2026.1-lunch',
        updatedAt:'2026-08-10',
        sourceFiles:['app-v6-menu.js','app-v6-weight.js'],
        sources:[
          '서울시 배달·포장 이용 통계 및 서울시민먹거리조사',
          '2025 서울배달+땡겨요 공개 주문 규모',
          '2024 신한카드 배달앱 업종 구성과 순위',
          '공개 배달 플랫폼 메뉴·계절 트렌드'
        ]
      },
      dinner:{
        title:'서울 저녁 메뉴 결정판',
        short:'서울 저녁',
        accent:'#7c4f45',
        description:'고기구이·치킨·전골·중식·일식·양식·세계음식·건강식까지 포함한 저녁 결정 보드.',
        root:DINNER_ROOT_V7,
        centerMode:'weighted-random',
        version:'2026.1-dinner',
        updatedAt:'2026-08-10',
        sourceFiles:['app-v7-menus.js','app-v6-weight.js'],
        sources:[
          '2024 신한카드 배달앱 업종 구성과 저녁 주문 시간대',
          '서울시민먹거리조사',
          '서울 배달·포장 이용 맥락',
          '서울에서 일반적으로 주문 가능한 저녁 메뉴 분류'
        ]
      },
      dessert:{
        title:'서울 디저트 결정판',
        short:'서울 디저트',
        accent:'#9a5f78',
        description:'케이크·베이커리·쿠키·아이스크림·빙수·전통·세계·음료형 디저트를 포함한 결정 보드.',
        root:DESSERT_ROOT_V7,
        centerMode:'weighted-random',
        version:'2026.1-dessert',
        updatedAt:'2026-08-10',
        sourceFiles:['app-v7-menus.js','app-v6-weight.js'],
        sources:[
          '카페·베이커리 공개 소비 트렌드',
          '카페 채널 케이크·디저트 성장 자료',
          '1~2인 소용량 디저트 선호',
          '배달과 포장에 적합한 서울 디저트 메뉴 분류'
        ]
      }
    }
  });
})();
