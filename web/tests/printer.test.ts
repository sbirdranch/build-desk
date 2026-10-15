import test from 'node:test';
import assert from 'node:assert/strict';
import {mqttPacket,mqttString,readFrames} from '../../tools/printer-monitor.mjs';
import {recordedPrinter} from '../src/server/printer';

test('printer MQTT stream handles fragmented and combined status frames',()=>{
 const body=Buffer.concat([mqttString('device/test/report'),Buffer.from(JSON.stringify({print:{gcode_state:'RUNNING',mc_percent:42,padding:'x'.repeat(200)}}))]);
 const message=mqttPacket(0x30,body);
 const partial=readFrames(message.subarray(0,2));assert.equal(partial.frames.length,0);
 const rest=readFrames(Buffer.concat([partial.remainder,message.subarray(2),mqttPacket(0xd0)]));
 assert.equal(rest.frames.length,2);assert.equal(rest.frames[0].header,0x30);assert.ok(rest.frames[0].body.equals(body));assert.equal(rest.frames[1].header,0xd0);assert.equal(rest.remainder.length,0);
});
test('printer status parser rejects oversized or malformed frame lengths',()=>{
 assert.throws(()=>readFrames(Buffer.from([0x30,0xff,0xff,0xff,0x7f])),/Oversize/);
 assert.throws(()=>readFrames(Buffer.from([0x30,0x80,0x80,0x80,0x80,0x01])),/Invalid/);
});
test('printer views show data age, preserve last observation and exclude connection secrets',()=>{
 const now=Date.parse('2026-10-15T20:00:00Z');
 const data={connection:'connected',lastSeen:'2026-10-15T19:59:55Z',state:'RUNNING',job:'Test plate',progress:44,remainingMinutes:152,layer:45,totalLayers:348,accessCode:'must-not-be-returned',serialNumber:'private-device-identity'};
 const fresh=recordedPrinter('H2D',data,now);assert.equal(fresh.status,'live');assert.equal(fresh.progress,44);assert.equal(fresh.remainingMinutes,152);assert.equal(JSON.stringify(fresh).includes('must-not-be-returned'),false);assert.equal(JSON.stringify(fresh).includes('private-device-identity'),false);
 const stale=recordedPrinter('H2D',data,now+60000);assert.equal(stale.status,'stale');assert.equal(stale.progress,44);
 assert.equal(recordedPrinter('H2D',{...data,connection:'offline'},now).status,'stale');
 assert.equal(recordedPrinter('H2D',{connection:'offline'},now).status,'offline');
 assert.equal(recordedPrinter('H2D',{...data,lastSeen:'invalid',progress:101},now).progress,undefined);
});
