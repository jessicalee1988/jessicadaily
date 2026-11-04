(function () {
  'use strict';
  const $=s=>document.querySelector(s);
  const status=(s)=>{const x=$('#cloudStatus');if(x)x.textContent=s};
  let sb=null, session=null, enabled=false, busy=false;
  const validOrder=o=>o&&typeof o.id==='string'&&typeof o.zalo==='string'&&typeof o.amount==='number';
  const authBlock=()=>$('#cloudAuth');
  async function initialize(){
    try{
      const r=await fetch('/api/cloud-config',{cache:'no-store'});
      if(!r.ok)throw Error('Không đọc được cấu hình');
      const cfg=await r.json();
      if(!cfg.configured){status('Chưa thiết lập lưu trữ đám mây trên Vercel. Ứng dụng vẫn lưu trên thiết bị và có thể xuất JSON.');return}
      if(!window.supabase?.createClient)throw Error('Thiếu thư viện đăng nhập');
      sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      enabled=true;authBlock().hidden=false;
      const {data,error}=await sb.auth.getSession();if(error)throw error;session=data.session;
      sb.auth.onAuthStateChange((_event,s)=>{session=s;draw()});
      draw();
    }catch(e){status('Chưa kết nối được đám mây: '+String(e.message||e))}
  }
  function draw(){
    const connected=!!session, $login=$('#cloudLogin'),$actions=$('#cloudActions');
    if($login)$login.hidden=connected;
    if($actions)$actions.hidden=!connected;
    if(connected)status('Đã đăng nhập: '+(session.user?.email||'').replace(/[<>]/g,''));
    else if(enabled)status('Đã cấu hình kết nối. Đăng nhập để sao lưu và đồng bộ.');
  }
  async function login(){
    if(!sb)return;
    const email=$('#cloudEmail').value.trim(),password=$('#cloudPassword').value;
    if(!email||password.length<8)return status('Nhập email và mật khẩu từ 8 ký tự.');
    status('Đang đăng nhập...');
    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error)status('Không đăng nhập được: '+error.message);
  }
  async function signup(){
    if(!sb)return;
    const email=$('#cloudEmail').value.trim(),password=$('#cloudPassword').value;
    if(!email||password.length<8)return status('Nhập email và mật khẩu từ 8 ký tự.');
    const {error}=await sb.auth.signUp({email,password});
    status(error?'Không đăng ký được: '+error.message:'Đã gửi yêu cầu tạo tài khoản. Kiểm tra email xác minh (nếu được yêu cầu), sau đó đăng nhập.');
  }
  async function signout(){
    if(!sb)return;await sb.auth.signOut();status('Đã đăng xuất. Dữ liệu thiết bị vẫn được giữ nguyên.');
  }
  async function remote(){
    const {data,error}=await sb.from('jessica_snapshots').select('payload,updated_at').eq('user_id',session.user.id).maybeSingle();
    if(error)throw error;
    const payload=data?.payload;
    if(payload!=null&&(!Array.isArray(payload)||!payload.every(validOrder)))throw Error('Dữ liệu trên đám mây có định dạng không hợp lệ.');
    return data||null;
  }
  async function run(action){
    if(busy||!session||!window.JessicaBridge)return;
    busy=true;
    for(const b of document.querySelectorAll('[data-cloud-action]'))b.disabled=true;
    try{
      const cloud=await remote(),local=window.JessicaBridge.getOrders();
      if(action==='upload'){
        if(cloud&&Array.isArray(cloud.payload)&&cloud.payload.length){
          if(!confirm('Đám mây đang có '+cloud.payload.length+' order. TẢI LÊN sẽ thay thế toàn bộ dữ liệu đám mây bằng '+local.length+' order hiện tại. Bạn đã tải xuống bản sao lưu JSON chưa?'))return;
        }else if(!confirm('Sao lưu '+local.length+' order từ thiết bị lên đám mây?'))return;
        const {error}=await sb.from('jessica_snapshots').upsert({user_id:session.user.id,payload:local,updated_at:new Date().toISOString()},{onConflict:'user_id'});
        if(error)throw error;
        status('Đã sao lưu '+local.length+' order lên đám mây. Bạn vẫn nên xuất JSON định kỳ.');
      }else if(action==='download'){
        if(!cloud||!cloud.payload?.length)return status('Đám mây chưa có order để tải xuống.');
        if(local.length&&!confirm('THAY THẾ '+local.length+' order trên thiết bị bằng '+cloud.payload.length+' order từ đám mây? Hãy xuất JSON trước khi tiếp tục.'))return;
        window.JessicaBridge.replaceOrders(cloud.payload);
        status('Đã tải xuống '+cloud.payload.length+' order. Dữ liệu thiết bị đã được cập nhật.');
      }else if(action==='merge'){
        if(!cloud?.payload?.length)return status('Đám mây chưa có dữ liệu.');
        const map=new Map(local.map(o=>[o.id,o]));
        const unique=cloud.payload.filter(o=>!map.has(o.id));
        if(!unique.length)return status('Không có order mới cần nhập từ đám mây.');
        if(!confirm('Nhập thêm '+unique.length+' order chưa có trên thiết bị? Những order trùng mã sẽ giữ bản thiết bị.'))return;
        window.JessicaBridge.replaceOrders([...local,...unique]);
        status('Đã nhập thêm '+unique.length+' order từ đám mây. Hãy tải lên để đồng bộ kết quả.');
      }
    }catch(e){status('Đồng bộ thất bại: '+String(e.message||e))}
    finally{busy=false;for(const b of document.querySelectorAll('[data-cloud-action]'))b.disabled=false}
  }
  window.addEventListener('DOMContentLoaded',()=>{
    $('#cloudSignIn')?.addEventListener('click',login);
    $('#cloudSignUp')?.addEventListener('click',signup);
    $('#cloudSignOut')?.addEventListener('click',signout);
    for(const b of document.querySelectorAll('[data-cloud-action]'))b.addEventListener('click',()=>run(b.dataset.cloudAction));
    initialize();
  });
})();