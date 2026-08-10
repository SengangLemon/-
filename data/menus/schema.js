// Nonet bundled menu-data registry.
// All built-in decision-board data is shipped as static JavaScript with the app.
// There is no runtime API/fetch dependency, so the same files are included in web,
// PWA, Capacitor/WebView, and other packaged builds.
(function initNonetMenuRegistry(global){
  'use strict';

  const SCHEMA_VERSION = 1;
  const yearBuilds = global.NONET_MENU_YEAR_BUILDS || (global.NONET_MENU_YEAR_BUILDS = Object.create(null));

  function assert(condition,message){
    if(!condition) throw new Error(`[Nonet menu data] ${message}`);
  }

  function validateNode(node,path,stats,issues){
    if(!node || typeof node !== 'object'){
      issues.errors.push(`${path}: node must be an object`);
      return;
    }

    stats.nodes += 1;
    const children = Array.isArray(node.children) ? node.children : [];
    const isTerminal = Boolean(node.terminal) || children.length === 0;

    if(isTerminal) stats.terminals += 1;
    else stats.categories += 1;

    if(typeof node.title !== 'string' || !node.title.trim()){
      issues.errors.push(`${path}: title is required`);
    }
    if(children.length > 8){
      issues.errors.push(`${path}: a hub can have at most 8 children (found ${children.length})`);
    }
    if(node.terminal && children.length){
      issues.warnings.push(`${path}: terminal node has children; children will be ignored by the UI`);
    }
    if(node.weight != null && (!Number.isFinite(Number(node.weight)) || Number(node.weight) <= 0)){
      issues.warnings.push(`${path}: invalid weight; runtime will fall back to 1`);
    }

    const siblingTitles = new Set();
    for(const child of children){
      const title = String(child?.title || '').trim();
      if(title && siblingTitles.has(title)){
        issues.errors.push(`${path}: duplicate child title "${title}"`);
      }
      siblingTitles.add(title);
      validateNode(child,`${path} > ${title || '(untitled)'}`,stats,issues);
    }
  }

  function validateMap(map){
    const stats = {nodes:0,categories:0,terminals:0};
    const issues = {errors:[],warnings:[]};
    validateNode(map.root,map.title || map.id,stats,issues);
    return {stats,issues,valid:issues.errors.length===0};
  }

  function registerNonetMenuYear(year,payload){
    const numericYear = Number(year);
    assert(Number.isInteger(numericYear) && numericYear >= 2020,'year must be a four-digit integer');
    assert(payload && typeof payload === 'object',`missing payload for ${numericYear}`);
    assert(Number(payload.schemaVersion) === SCHEMA_VERSION,`schema mismatch for ${numericYear}`);
    assert(payload.maps && typeof payload.maps === 'object',`maps are required for ${numericYear}`);

    yearBuilds[numericYear] = Object.freeze({
      year:numericYear,
      schemaVersion:SCHEMA_VERSION,
      release:String(payload.release || `${numericYear}.1`),
      updatedAt:String(payload.updatedAt || `${numericYear}-01-01`),
      bundled:true,
      dataMode:'hardcoded-static',
      maps:Object.freeze(payload.maps),
      notes:String(payload.notes || '')
    });

    return yearBuilds[numericYear];
  }

  function activateNonetMenuYear(year){
    const numericYear = Number(year);
    const build = yearBuilds[numericYear];
    assert(build,`menu-data year ${numericYear} is not registered`);
    assert(typeof HUB_MAPS !== 'undefined' && Array.isArray(HUB_MAPS),'HUB_MAPS must be loaded before activation');

    const registry = Object.create(null);
    const activatedMaps = Object.entries(build.maps).map(([id,definition])=>{
      assert(definition && definition.root,`${numericYear}/${id}: root is required`);

      const dataset = Object.freeze({
        id,
        year:numericYear,
        version:String(definition.version || `${build.release}-${id}`),
        updatedAt:String(definition.updatedAt || build.updatedAt),
        schemaVersion:build.schemaVersion,
        bundled:true,
        dataMode:'hardcoded-static',
        sourceFiles:Array.isArray(definition.sourceFiles) ? [...definition.sourceFiles] : [],
        sources:Array.isArray(definition.sources) ? [...definition.sources] : [],
        clonePolicy:'snapshot',
        updatePolicy:'built-in-replaced-annually'
      });

      const map = {
        id,
        title:String(definition.title || id),
        short:String(definition.short || definition.title || id),
        accent:String(definition.accent || '#2f5d62'),
        description:String(definition.description || ''),
        root:definition.root,
        centerMode:String(definition.centerMode || 'weighted-random'),
        dataset
      };

      map.root.dataset = dataset;
      const validation = validateMap(map);
      registry[id] = Object.freeze({map,dataset,validation});

      if(!validation.valid){
        console.error(`[Nonet menu data] ${id} validation failed`,validation.issues.errors);
      }
      if(validation.issues.warnings.length){
        console.warn(`[Nonet menu data] ${id} warnings`,validation.issues.warnings);
      }

      return map;
    });

    HUB_MAPS.splice(0,HUB_MAPS.length,...activatedMaps);

    const nowYear = new Date().getFullYear();
    global.NONET_ACTIVE_MENU_YEAR = numericYear;
    global.NONET_MENU_CONFIG = Object.freeze({
      schemaVersion:SCHEMA_VERSION,
      activeYear:numericYear,
      release:build.release,
      updatedAt:build.updatedAt,
      bundled:true,
      offlineReady:true,
      stale:nowYear > numericYear,
      updatePolicy:Object.freeze({
        builtInBoards:'load the active hardcoded year',
        clonedBoards:'keep an immutable snapshot until the user explicitly clones a newer release',
        annualChange:'add a new year file, then change only data/menus/active.js'
      })
    });
    global.NONET_MENU_REGISTRY = Object.freeze(registry);
    global.NONET_BUNDLED_MENU_DATA = true;
    global.getNonetMenuDataset = id => registry[id] || null;
    global.validateNonetMenuData = () => Object.fromEntries(
      Object.entries(registry).map(([id,item])=>[id,item.validation])
    );

    return global.NONET_MENU_CONFIG;
  }

  global.NONET_MENU_SCHEMA_VERSION = SCHEMA_VERSION;
  global.registerNonetMenuYear = registerNonetMenuYear;
  global.activateNonetMenuYear = activateNonetMenuYear;
})(window);
