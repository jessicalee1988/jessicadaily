const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/cloud-sync.js','utf8');
const order=(id,amount=1)=>({id,zalo:id,amount});
async function setup(local,remote,base){
 const events={},timers=[],els={},storage=new Map();let data=structuredClone(local),row=structuredClone(remote),writes=0,race=false,paused=false;
 if(base)storage.set('jessica-sync-v3:u',JSON.stringify(base));
 const el=id=>els[id]??=( {textContent:'',hidden:false,disabled:false,value:'',addEventListener:(n,f)=>{events[id+':'+n]=f},querySelectorAll:()=>[],append(){},after(){},setAttribute(){}} );
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'u',email:'test'}}}}),onAuthStateChange(){}},from(){
 let op='read',value,filters={};const query={select(){return query},eq(k,v){filters[k]=v;return query},update(v){op='update';value=v;return query},insert(v){op='insert';value=v;return query},maybeSingle:async()=>({data:structuredClone(row)}),then(resolve){
 if(paused){paused=false;data.push(order('during'));events['jessica:orders-changed']()}
 if(race){race=false;row={payload:[order('competitor')],updated_at:'2030-01-01T00:00:00.000Z'}}
 if(op==='insert'&&row)return resolve({error:{code:'23505'}});
 if(op==='update'&&(!row||row.updated_at!==filters.updated_at))return resolve({data:[]});
 row=structuredClone(value);writes++;resolve({data:[{updated_at:row.updated_at}]});}};return query;
 }};
 const context={console,structuredClone,Map,Set,Date,JSON,Number,String,Error,Event:function(){},confirm:()=>true,navigator:{onLine:true},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:f=>{timers.push(f);return f},clearTimeout:f=>{const i=timers.indexOf(f);if(i>=0)timers.splice(i,1)},setInterval(){},fetch:async()=>({ok:true,json:async()=>({configured:true})}),document:{visibilityState:'visible',querySelector:s=>el(s),querySelectorAll:()=>[],createElement:()=>el('panel'),addEventListener:(n,f)=>events[n]=f}};
 context.window={supabase:{createClient:()=>client},JessicaBridge:{getOrders:()=>structuredClone(data),replaceOrders:p=>{data=structuredClone(p);events['jessica:orders-changed']?.()}},addEventListener:(n,f)=>events[n]=f};
 vm.runInNewContext(source,context);events.DOMContentLoaded();for(let i=0;i<12;i++)await Promise.resolve();
 async function flush(){for(let n=0;timers.length&&n<15;n++){await timers.shift()();for(let i=0;i<12;i++)await Promise.resolve()}}
 await flush();return {get data(){return data},get row(){return row},get writes(){return writes},get status(){return el('#cloudStatus').textContent},async change(p){data=p;events['jessica:orders-changed']();await flush()},setRemote(p){row=p},offline(){context.navigator.onLine=false},async online(){context.navigator.onLine=true;events.online();await flush()},race(){race=true},pause(){paused=true},async poll(){events.focus();await flush()},storage};
}
(async()=>{
 const a=[order('a')],stamp='2026-11-05T00:00:00.000Z',base={base:a,updated_at:stamp};
 let h=await setup([], {payload:a,updated_at:stamp});assert.deepEqual(h.data,a);assert.equal(h.writes,0);
 h=await setup(a,{payload:a,updated_at:stamp});await h.change([order('a',2)]);assert.equal(h.row.payload[0].amount,2);assert.equal(h.writes,1);
 h=await setup([order('local')],{payload:a,updated_at:stamp});assert.match(h.status,/xung đột/);assert.equal(h.writes,0);assert.equal(h.data[0].id,'local');
 h=await setup(a,{payload:a,updated_at:stamp},base);h.setRemote({payload:[order('remote')],updated_at:'2026-11-06'});await h.poll();assert.equal(h.data[0].id,'remote');assert.equal(h.writes,0);
 h=await setup(a,{payload:a,updated_at:stamp},base);h.setRemote({payload:[order('remote')],updated_at:'2026-11-06'});await h.change([order('local')]);assert.match(h.status,/xung đột/);assert.equal(h.writes,0);
 h=await setup(a,{payload:a,updated_at:stamp});h.offline();await h.change([order('offline')]);assert.equal(h.writes,0);await h.online();assert.equal(h.row.payload[0].id,'offline');
 h=await setup(a,{payload:a,updated_at:stamp});h.race();await h.change([order('local')]);assert.match(h.status,/xung đột/);assert.equal(h.row.payload[0].id,'competitor');assert.equal(h.writes,0);
 h=await setup(a,{payload:a,updated_at:stamp});h.pause();await h.change([order('local')]);assert.equal(h.row.payload.length,2);assert.equal(h.row.payload[1].id,'during');
 h=await setup(a,{payload:a,updated_at:stamp});await h.change([]);assert.deepEqual(h.row.payload,[]);
 console.log('PASS: 9 sync scenarios (initial download, automatic save, first conflict, remote refresh, dual edit, offline retry, atomic race, edit during save, deletion).');
})().catch(e=>{console.error(e);process.exit(1)});
