import {test} from 'node:test';import assert from 'node:assert/strict';import {participantLayout} from '../src/participantLayout.js';
test('one to six participant cards fit the available width and height when resizing',()=>{
 for(const [width,height] of [[1100,650],[720,430],[350,520],[220,250],[900,170]])for(let count=1;count<=6;count++){
  const {tileWidth,tileHeight,columns}=participantLayout(width,height,count);const rows=Math.ceil(count/columns);
  assert.ok(tileWidth>0&&tileHeight>0);assert.ok(columns*tileWidth+(columns-1)*12<=width);assert.ok(rows*tileHeight+(rows-1)*12<=height);assert.ok(Math.abs(tileWidth/tileHeight-1.6)<.2);
 }
 const small=participantLayout(700,300,6),large=participantLayout(1300,700,6);assert.ok(large.tileWidth>small.tileWidth);
});
