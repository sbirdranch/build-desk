import test from 'node:test';
import assert from 'node:assert/strict';
import {activePrintAnchor} from '../src/core/active-print';
const path=['vehicle','section:Front','file:front','plate:P08'];
test('current tracked print follows the deepest expanded visible ancestor and stops at plate',()=>{
 for(let depth=0;depth<path.length;depth++){
  const expanded=new Set(path.slice(0,depth));
  assert.equal(activePrintAnchor(path,key=>expanded.has(key),()=>true),path[depth]);
 }
 assert.equal(activePrintAnchor(path,()=>true,()=>true),'plate:P08');
});
test('filtering an active branch keeps its indicator at the nearest visible ancestor',()=>{
 assert.equal(activePrintAnchor(path,()=>true,key=>key!=='plate:P08'),'file:front');
 assert.equal(activePrintAnchor(path,()=>true,key=>key!=='file:front'),'section:Front');
 assert.equal(activePrintAnchor(path,()=>true,key=>key!=='section:Front'),'vehicle');
});
