import test from 'node:test';
import assert from 'node:assert/strict';
import {completionState} from '../src/core/completion';
import type {Part} from '../src/core/types';
const part=(id:string,required:number|null,accepted:number):Part=>({id,required,accepted,name:id,section:'Cabin',source:'',material:'',opening:0,installed:0,notes:''});
test('tree completion requires all descendant parts accepted, independent of print runs',()=>{
 assert.equal(completionState([part('a',2,2),part('b',1,3)]),'complete');
 assert.equal(completionState([part('a',2,2),part('b',1,0)]),'partial');
 assert.equal(completionState([part('a',2,1)]),'partial');
 assert.equal(completionState([part('a',2,0)]),'not-printed');
});
test('empty, unconfirmed and unmatched branches cannot be marked complete',()=>{
 assert.equal(completionState([]),'unconfirmed');
 assert.equal(completionState([part('a',null,0)]),'unconfirmed');
 assert.equal(completionState([part('a',1,1)],true),'partial');
 assert.equal(completionState([part('a',1,0)],true),'unconfirmed');
 assert.equal(completionState([part('a',0,0)]),'complete');
});
