"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),{reconcile}=require('../public/team-view');
test('đổi phiên của cùng nhân viên giữ một nhân vật và một bàn, không nhân bản sau nhiều lượt',()=>{
 const visual={employeeId:'dat',marker:'original'},views={'roster-dat':visual},seats={'roster-dat':[110,570]};let removes=0;
 for(let i=0;i<12;i++) {const key='session-'+i;const agents=reconcile(views,[{key,employeeId:'dat',name:'Đạt Codex'}],{move(oldKey,newKey){seats[newKey]=seats[oldKey];delete seats[oldKey];},remove(){removes++;}}); assert.equal(agents.length,1);assert.deepEqual(Object.keys(views),[key]);assert.equal(views[key],visual);assert.deepEqual(seats[key],[110,570]);}
 assert.equal(removes,0);assert.equal(Object.keys(seats).length,1);
});
test('dọn các nhân vật cũ đã vắng khỏi trạng thái, giữ hai nhân viên khác nhau dù cùng tên',()=>{
 const views={old:{},dat:{employeeId:'dat'},ninh:{employeeId:'ninh'}},removed=[];
 reconcile(views,[{key:'dat',employeeId:'dat',name:'Kỹ sư'},{key:'ninh',employeeId:'ninh',name:'Kỹ sư'}],{remove(key){removed.push(key);}});
 assert.deepEqual(removed,['old']);assert.equal(Object.keys(views).length,2);
});
test('trạng thái lặp cùng mã nhân viên chỉ tạo một nhân vật',()=>{assert.equal(reconcile({},[{key:'one',employeeId:'dat'},{key:'two',employeeId:'dat'}]).length,1);});
