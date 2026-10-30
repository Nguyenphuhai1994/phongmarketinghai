"use strict";
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const { readChannels, saveChannels, promptChannels } = require('../lib/office-channels');
function fixture(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifesport-channels-')); t.after(() => fs.rmSync(dir,{recursive:true,force:true})); return dir; }
const channel = { id:'facebook-lifesport',name:'Facebook Lifesport',platform:'facebook',url:'https://www.facebook.com/profile.php?id=61586960995230',employeeId:'tro-ly',purpose:'Nhận nội dung từ Trinh' };
test('khai báo kênh không tự cấp quyền đăng, lưu qua vp và giữ bản cũ', (t) => {
  const dir = fixture(t), before = readChannels(dir);
  const result = JSON.parse(execFileSync(process.execPath, [path.resolve(__dirname,'../tools/vp.js'),'kenh','luu'], { input: JSON.stringify({revision:before.revision,channels:[{...channel,canPublish:true,connectionStatus:'connected',password:'not-to-store'}]}), encoding:'utf8',env:{...process.env,VP_DATA:dir} }));
  assert.equal(result.channels[0].canPublish,false); assert.equal(result.channels[0].connectionStatus,'not_connected'); assert.equal(result.channels[0].publishingPolicy,'employee_permissions');
  assert(!fs.readFileSync(path.join(dir,'control/channels.json'),'utf8').includes('not-to-store'));
  assert.equal(fs.readdirSync(path.join(dir,'control/channels-history')).length,1);
  assert.throws(()=>saveChannels(dir,{revision:before.revision,channels:[]}),/thay đổi/);
  const prompt = promptChannels(dir); assert(prompt.includes(channel.url)); assert(prompt.includes('\"connected\":false')); assert(prompt.includes('Nhận nội dung từ Trinh'));
});
test('từ chối URL chứa thông tin đăng nhập, giao thức lạ và đích Facebook sai', (t) => {
  const dir=fixture(t), revision=readChannels(dir).revision;
  for(const url of ['javascript:alert(1)','http://facebook.com/','https://user:password@facebook.com/','https://facebook.com/?access_token=secret','https://facebook.com.evil.example/','invalid-url']) assert.throws(()=>saveChannels(dir,{revision,channels:[{...channel,url}]}));
  assert.equal(readChannels(dir).channels.length,0);
  assert.throws(()=>saveChannels(dir,{revision,channels:[channel,channel]}),/trùng/);
});
