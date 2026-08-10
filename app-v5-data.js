// Public runtime primitives only.
// Personal study courses are NOT bundled here. They are imported per-browser
// from a private study-pack file and stored in localStorage.
const T={
  concept:['개념','#52705d','#e0e9e1'],
  definition:['정의','#66727b','#e5e9eb'],
  theorem:['정리','#4b6788','#dee8f2'],
  proof:['증명','#705c83','#e9e1ef'],
  example:['예제','#8b6a3b','#f0e5d2'],
  warning:['주의','#9a4a3a','#f2e0da'],
  exercise:['문제','#a06432','#f2e3d4'],
  connection:['연결','#6b746a','#e5e9e2']
};
T.category=['분류','#8a6b3e','#efe4d1'];
T.terminal=['최종 선택','#b36b2f','#f4e1ca'];

// Filled only from localStorage/private import. New visitors start with no courses.
let COURSES=[];

const SLOT_ORDER=[0,1,2,3,5,6,7,8];
const terminalNode=(title,summary='')=>({
  title,
  type:'terminal',
  summary:summary||`${title}을(를) 최종 선택지로 고릅니다.`,
  terminal:true,
  children:[]
});
const categoryNode=(title,summary,children=[])=>({title,type:'category',summary,children});

// Built-in decision boards are filled by the versioned hardcoded menu files.
const HUB_MAPS=[];
