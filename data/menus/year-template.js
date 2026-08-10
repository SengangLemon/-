// Copy this file to data/menus/YYYY/index.js and do not load this template directly.
// Define the new lunch, dinner, and dessert root constants before this file.
(function registerMenuReleaseYYYY(){
  const YEAR=2099;
  registerNonetMenuYear(YEAR,{
    schemaVersion:1,
    release:`${YEAR}.1`,
    updatedAt:`${YEAR}-01-01`,
    notes:'Describe the annual update here.',
    maps:{
      lunch:{
        title:'서울 점심 메뉴 결정판',
        short:'서울 점심',
        accent:'#b36b2f',
        description:'Describe the new lunch dataset.',
        root:LUNCH_ROOT_YYYY,
        centerMode:'weighted-random',
        version:`${YEAR}.1-lunch`,
        sourceFiles:[`data/menus/${YEAR}/lunch.js`],
        sources:['Add public source notes here.']
      },
      dinner:{
        title:'서울 저녁 메뉴 결정판',
        short:'서울 저녁',
        accent:'#7c4f45',
        description:'Describe the new dinner dataset.',
        root:DINNER_ROOT_YYYY,
        centerMode:'weighted-random',
        version:`${YEAR}.1-dinner`,
        sourceFiles:[`data/menus/${YEAR}/dinner.js`],
        sources:['Add public source notes here.']
      },
      dessert:{
        title:'서울 디저트 결정판',
        short:'서울 디저트',
        accent:'#9a5f78',
        description:'Describe the new dessert dataset.',
        root:DESSERT_ROOT_YYYY,
        centerMode:'weighted-random',
        version:`${YEAR}.1-dessert`,
        sourceFiles:[`data/menus/${YEAR}/dessert.js`],
        sources:['Add public source notes here.']
      }
    }
  });
})();
