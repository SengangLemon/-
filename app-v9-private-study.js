// v9: browser-local private study packs.
// No course content is bundled in the public app. A user imports a JSON pack once;
// the pack is then stored only in that browser's localStorage.
(function installPrivateStudyPacks(global){
  'use strict';

  const STORAGE_KEY='nonet:private-study-pack-v1';
  const FORMAT='nonet-private-study-pack';
  const VERSION=1;

  function validateNode(node,path,issues){
    if(!node||typeof node!=='object'){issues.push(`${path}: invalid node`);return;}
    if(typeof node.title!=='string'||!node.title.trim())issues.push(`${path}: title is required`);
    const children=Array.isArray(node.children)?node.children:[];
    if(children.length>8)issues.push(`${path}: at most 8 children are allowed`);
    children.forEach((child,index)=>validateNode(child,`${path}/${index}`,issues));
  }

  function validateCourse(course,index,issues){
    if(!course||typeof course!=='object'){issues.push(`course ${index}: invalid object`);return;}
    if(!course.id||!course.title)issues.push(`course ${index}: id/title required`);
    if(!Array.isArray(course.chapters))issues.push(`course ${index}: chapters must be an array`);
    for(const chapter of course.chapters||[]){
      if(!chapter.id||!chapter.title)issues.push(`${course.id}: chapter id/title required`);
      if(!Array.isArray(chapter.concepts))issues.push(`${course.id}/${chapter.id}: concepts must be an array`);
      (chapter.concepts||[]).forEach((node,i)=>validateNode(node,`${course.id}/${chapter.id}/${i}`,issues));
    }
  }

  function normalizePack(raw){
    const pack=typeof raw==='string'?JSON.parse(raw):raw;
    if(!pack||typeof pack!=='object')throw new Error('학습팩 형식이 올바르지 않습니다.');
    if(pack.format!==FORMAT)throw new Error('Nonet 개인 학습팩 파일이 아닙니다.');
    if(Number(pack.version)!==VERSION)throw new Error(`지원하지 않는 학습팩 버전입니다: ${pack.version}`);
    if(!Array.isArray(pack.courses))throw new Error('courses 배열이 없습니다.');
    const issues=[];
    pack.courses.forEach((course,index)=>validateCourse(course,index,issues));
    if(issues.length)throw new Error(issues.slice(0,5).join('\n'));
    return {
      format:FORMAT,
      version:VERSION,
      title:String(pack.title||'내 학습팩'),
      updatedAt:String(pack.updatedAt||new Date().toISOString()),
      courses:JSON.parse(JSON.stringify(pack.courses))
    };
  }

  function activate(pack){
    COURSES.splice(0,COURSES.length,...pack.courses);
    global.NONET_PRIVATE_STUDY_META=Object.freeze({
      title:pack.title,
      updatedAt:pack.updatedAt,
      courseCount:pack.courses.length,
      storage:'localStorage',
      privateToBrowser:true
    });
    return pack;
  }

  function loadStored(){
    try{
      const text=localStorage.getItem(STORAGE_KEY);
      if(!text)return null;
      return activate(normalizePack(text));
    }catch(error){
      console.error('[Nonet private study] failed to load',error);
      return null;
    }
  }

  global.importNonetPrivateStudyPack=function importNonetPrivateStudyPack(raw){
    const pack=normalizePack(raw);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(pack));
    activate(pack);
    return global.NONET_PRIVATE_STUDY_META;
  };

  global.clearNonetPrivateStudyPack=function clearNonetPrivateStudyPack(){
    localStorage.removeItem(STORAGE_KEY);
    COURSES.splice(0,COURSES.length);
    delete global.NONET_PRIVATE_STUDY_META;
  };

  global.exportNonetPrivateStudyPack=function exportNonetPrivateStudyPack(){
    return localStorage.getItem(STORAGE_KEY)||'';
  };

  global.hasNonetPrivateStudyPack=function hasNonetPrivateStudyPack(){
    return COURSES.length>0;
  };

  global.NONET_PRIVATE_STUDY_STORAGE_KEY=STORAGE_KEY;
  loadStored();
})(window);
