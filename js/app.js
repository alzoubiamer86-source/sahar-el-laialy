/* سهر الليالي v7.2 — Full Client */
const CONFIG = {
  API_URL:    window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com',
  SOCKET_URL: window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com'
};

// ── Theme system (night/classic/rose/emerald) ──────────────────────
(function(){
  const saved=localStorage.getItem('sahar_theme');
  document.documentElement.dataset.theme = saved || 'light';
})();
function setTheme(name){
  document.documentElement.dataset.theme=name;
  localStorage.setItem('sahar_theme',name);
  document.querySelectorAll('.theme-swatch').forEach(sw=>sw.classList.toggle('active',sw.dataset.sw===name));
  document.getElementById('themePickerOverlay').style.display='none';
}
function openThemePicker(){
  const current=document.documentElement.dataset.theme||'light';
  document.querySelectorAll('.theme-swatch').forEach(sw=>sw.classList.toggle('active',sw.dataset.sw===current));
  document.getElementById('themePickerOverlay').style.display='flex';
}

// ── Site-styled replacements for native confirm()/prompt() ──────────
function showConfirm(message,title='⚠️ تأكيد'){
  return new Promise(resolve=>{
    $('customConfirmTitle').textContent=title;
    $('customConfirmMsg').textContent=message;
    $('customConfirmInput').style.display='none';
    $('customConfirmOverlay').style.display='flex';
    bringToFront($('customConfirmOverlay'));
    const okBtn=$('customConfirmOkBtn'),cancelBtn=$('customConfirmCancelBtn');
    const cleanup=()=>{$('customConfirmOverlay').style.display='none';okBtn.removeEventListener('click',onOk);cancelBtn.removeEventListener('click',onCancel);};
    const onOk=()=>{cleanup();resolve(true);};
    const onCancel=()=>{cleanup();resolve(false);};
    okBtn.addEventListener('click',onOk);
    cancelBtn.addEventListener('click',onCancel);
  });
}
function showPrompt(message,defaultValue='',title='✏️ إدخال'){
  return new Promise(resolve=>{
    $('customConfirmTitle').textContent=title;
    $('customConfirmMsg').textContent=message;
    const input=$('customConfirmInput');
    input.style.display='block';input.value=defaultValue;
    $('customConfirmOverlay').style.display='flex';
    bringToFront($('customConfirmOverlay'));
    setTimeout(()=>input.focus(),50);
    const okBtn=$('customConfirmOkBtn'),cancelBtn=$('customConfirmCancelBtn');
    const cleanup=()=>{$('customConfirmOverlay').style.display='none';okBtn.removeEventListener('click',onOk);cancelBtn.removeEventListener('click',onCancel);input.removeEventListener('keydown',onKey);};
    const onOk=()=>{const v=input.value;cleanup();resolve(v);};
    const onCancel=()=>{cleanup();resolve(null);};
    const onKey=e=>{if(e.key==='Enter'){e.preventDefault();onOk();}if(e.key==='Escape')onCancel();};
    okBtn.addEventListener('click',onOk);
    cancelBtn.addEventListener('click',onCancel);
    input.addEventListener('keydown',onKey);
  });
}

const state = {
  token:null, user:null, socket:null,
  rooms:[], currentRoom:null, onlineUsers:[],
  replyTo:null, selectedAvatar:'🌙', selectedRoomIcon:'💬',
  pmTarget:null, typingTimer:null, isTyping:false, editingRoom:null,
  textColor:'#000000', fontSize:14, bold:false, italic:false,
  stageUsers:[], micActive:false, camActive:false, handRaised:false,
  localStream:null, deviceFp:null, undercover:false,
  muteTarget:null, permTarget:null, pendingRoomJoin:null, banTarget:null,
  spyRooms:[], spyMessages:{}, spyPms:[],
  adminLogs:[], roomLogs:[],
  deviceSettings:{ micId:'', speakerId:'', camId:'' },
  roomSettings:{ freeMic:true, requireHand:false, maxMicTime:0, maxSpeakers:1, camAllow:true, camRequireApproval:true, whoCan:'all', maxCams:5, welcomeMsg:'مرحباً %NAME% في سهر الليالي', noAvatars:false, noURLs:false },
  myMuteStatus:null, imageAllowed:false, notifications:0,
  soundsEnabled:true, userStatus:'', rejectAllPm:false,
  selfMuted:false, speakerMuted:false,
  pmBlockList: new Set(), _lockingRoomId:null
};

const OWNER_USERNAME = 'owner';
const isOwner  = () => state.user?.username?.toLowerCase() === OWNER_USERNAME && state.user?.role === 'owner';
const isAdmin  = () => ['owner','master','super_admin','moderator'].includes(state.user?.role);

const ROLE_LEVELS = { guest:0, user:1, moderator:2, super_admin:3, master:4, owner:5 };
const ROLE_LBL    = { owner:'👑 مالك', master:'🌟 ماستر', super_admin:'⚡ سوبر أدمن', moderator:'🛡️ مشرف', user:'👤 عضو', guest:'🔓 زائر' };
const ROLE_COLORS = { owner:'#8b0000', master:'#8b4513', super_admin:'#6a0dad', moderator:'#00008b', user:'#1a5a1a', guest:'#4a4a6a' };
const RANK_PERMS_MAX = {
  guest:       [],
  user:        [],
  moderator:   ['blockMachine','muteUsers','kickout','banUsers','sortMicList','clearText','broadcast','unban','viewLog','sendImages','dragToRoom'],
  super_admin: ['blockMachine','muteUsers','kickout','banUsers','sortMicList','clearText','broadcast','unban','viewLog','manageAccounts','manageMembers','manageAdmins','sendImages','dragToRoom','roomSettings','adminReports','profilePic','invite121'],
  master:      ['blockMachine','muteUsers','kickout','banUsers','sortMicList','clearText','broadcast','unban','viewLog','manageAccounts','manageMembers','manageAdmins','manageSuperAdmins','sendImages','dragToRoom','roomSettings','adminReports','profilePic','machineLock','invite121'],
};
const RANK_PERMS = RANK_PERMS_MAX; 

const AVATARS    = ['🌙','⭐','🌟','💫','🌸','🌺','🦋','🐉','🦁','🐺','🦊','🐻','🦅','🌊','🔥','⚡','🎭','🎨','🎵','🏆','👑','💎','🌈','🎯','🚀','🌴','🏰','⚔️','🛡️','🎤','📷','🌹','🍵','☕','🌿','🦄','🐬','🌻','🍀'];
const ROOM_ICONS = ['💬','🌙','⭐','🎵','🎮','📚','🌹','🏆','🎭','🌊','🔥','💎','🕌','🎨','🌿','🤝','🎤','📷','🌺','🏄','☕','🍵','🏠','🌃','🎪','🧩','🌐','🔮'];
const USER_STATUSES = [
  {key:'',label:'متصل',icon:'🟢'},{key:'away',label:'بعيد',icon:'🌙'},
  {key:'eating',label:'يأكل',icon:'🍽️'},{key:'busy',label:'مشغول',icon:'⛔'},
  {key:'phone',label:'على الهاتف',icon:'📞'},{key:'sleeping',label:'نائم',icon:'😴'}
];
const ANIMATED_EMOJIS = new Set(['😂','🤣','😍','🥰','😘','😎','🤩','😱','🥺','😭','😡','🤯','🥳','🤗','😴','😷','🎉','🎊','🔥','💥','❤️','💔','👍','👎','👏','🙌','🙏','💪']);
const EMOJIS = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','🤩','😘','☺️','😚','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','👋','🤚','🖐️','✋','🖖','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','💔','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💓','💗','💖','💘','💝','🌹','🌷','🌸','💐','🌼','🌻','🌞','🌙','⭐','🌟','💫','✨','🌈','☀️','🌊','💧','🔥','💥','🎉','🎊','🎈','🎁','🏆','🥇','🎤','🎧','🎵','🎶','🎸','🎹','🎺','🥁','🎲','🎯','🎭','🎨','🍕','🍔','🍟','🌭','🍣','🍜','🧁','🎂','🍰','☕','🍵','🥤','🍺','🍷','⚽','🏀','🏈','⚾','🎾','🏐','🏓','🥊','💻','📱','📷','📹','🔑','💡','👑','💎','🔮','🌍','🏰','🕌'];
const PALETTE = ['#000000','#800000','#008000','#000080','#800080','#008080','#c00000','#00c000','#0000c0','#c000c0','#00c0c0','#c0c000','#ff0000','#00ff00','#0000ff','#ff00ff','#00ffff','#ffff00','#ff8000','#8000ff','#0080ff','#ff0080','#80ff00','#00ff80','#ff8080','#80ff80','#8080ff','#ff80ff','#80ffff','#ffff80','#804000','#408000','#004080','#400080','#800040','#408080','#ffffff','#c0c0c0','#808080','#404040'];
const PERMS_LIST = [
  {key:'blockMachine',label:'حظر الأجهزة'},{key:'muteUsers',label:'كتم المستخدمين'},{key:'kickout',label:'طرد'},{key:'banUsers',label:'حظر المستخدمين'},{key:'sortMicList',label:'ترتيب قائمة الميك'},{key:'clearText',label:'مسح النص'},{key:'broadcast',label:'بث رسالة'},{key:'unban',label:'رفع الحظر'},{key:'viewLog',label:'عرض السجل'},{key:'manageAccounts',label:'إدارة الحسابات'},{key:'manageMembers',label:'إدارة الأعضاء'},{key:'manageAdmins',label:'إدارة المشرفين'},{key:'manageSuperAdmins',label:'إدارة السوبر أدمن'},{key:'manageMasters',label:'إدارة الماستر'},{key:'roomSettings',label:'إعدادات الغرفة'},{key:'adminReports',label:'تقارير الإدارة'},{key:'sendImages',label:'إرسال الصور'},{key:'dragToRoom',label:'نقل مستخدمين بين الغرف'},{key:'profilePic',label:'رفع صورة شخصية'},{key:'machineLock',label:'قفل الجهاز'},{key:'invite121',label:'دعوة لمحادثة خاصة 1:1'},
];

const $ = id => document.getElementById(id);
const el = (tag,cls,html) => { const e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e; };
const CAMERA_PEERS = new Map();

function playSound(name) {
  if (!state.soundsEnabled) return;
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator(); const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const cfg={login:{f:880,t:.3},logout:{f:440,t:.3},mic_on:{f:660,t:.25},mic_off:{f:330,t:.25}};
    const c=cfg[name]||{f:500,t:.2};
    osc.frequency.value=c.f; osc.type='sine';
    gain.gain.setValueAtTime(.25,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+c.t);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+c.t);
  } catch(e){}
}

document.addEventListener('DOMContentLoaded', async () => {
  state.deviceFp = await fingerprint();
  buildAll(); bindLogin(); bindChat();
  document.getElementById('themeBtnLogin')?.addEventListener('click', openThemePicker);
  document.getElementById('themeBtnChat')?.addEventListener('click', openThemePicker);
  document.getElementById('themePickerOverlay')?.addEventListener('mousedown', e=>{ if(e.target.id==='themePickerOverlay') e.currentTarget.style.display='none'; });
  const ds=localStorage.getItem('sahar_devices'); if(ds) try{state.deviceSettings=JSON.parse(ds);}catch{}
  const sc=localStorage.getItem('sahar_textcolor'); if(sc) applyColor(sc);
  const tok=localStorage.getItem('sahar_token'); const usr=localStorage.getItem('sahar_user');
  if(tok&&usr){ try{state.token=tok;state.user=JSON.parse(usr);proceedAfterLogin(state.user);}catch{doLogout();} }
  buildStatusPicker();
});

async function fingerprint() {
  const d=[navigator.userAgent,navigator.language,screen.width,screen.height,navigator.hardwareConcurrency||0].join('|');
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(d));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
}

function buildAll() {
  ['avatarGrid','profileAvatarGrid'].forEach(id=>{
    const g=$(id); if(!g) return;
    AVATARS.forEach(a=>{ const d=el('div','av-opt',a); if(a===state.selectedAvatar)d.classList.add('selected'); d.addEventListener('click',()=>{g.querySelectorAll('.av-opt').forEach(o=>o.classList.remove('selected'));d.classList.add('selected');state.selectedAvatar=a;if(id==='profileAvatarGrid')$('profAvatarBig').textContent=a;}); g.appendChild(d); });
  });
  const ig=$('roomIconGrid'); if(ig) ROOM_ICONS.forEach(i=>{const d=el('div','ri-opt',i);if(i===state.selectedRoomIcon)d.classList.add('selected');d.addEventListener('click',()=>{ig.querySelectorAll('.ri-opt').forEach(o=>o.classList.remove('selected'));d.classList.add('selected');state.selectedRoomIcon=i;});ig.appendChild(d);});
  const ep=$('emojiPicker'); if(ep) EMOJIS.forEach(e=>{const d=el('span','emoji-item',e);d.addEventListener('click',()=>{insertAt($('msgInput'),e);$('emojiPicker').style.display='none';});ep.appendChild(d);});
  const pep=$('pmEmojiPicker'); if(pep) EMOJIS.slice(0,80).forEach(e=>{const d=el('span','emoji-item',e);d.addEventListener('click',()=>{insertAt($('pmInput'),e);pep.style.display='none';});pep.appendChild(d);});
  const cg=$('colorGrid'); if(cg) PALETTE.forEach(c=>{const s=el('div','c-swatch');s.style.background=c;s.title=c;s.addEventListener('click',()=>{applyColor(c);$('colorPanel').style.display='none';});cg.appendChild(s);});
  const npg=$('newAccPermsGrid'); if(npg) PERMS_LIST.forEach(p=>{const l=el('label','chk-row');l.innerHTML=`<input type="checkbox" id="nacp_${p.key}"> <span>${p.label}</span>`;npg.appendChild(l);});
  buildRoleDropdown($('newAccRole'),false);
  $('newAccRole')?.addEventListener('change',updateNewAccPermsAvailability);
  updateNewAccPermsAvailability();
}
function updateNewAccPermsAvailability(){
  const role=$('newAccRole')?.value||'user';
  const ceiling=RANK_PERMS_MAX[role]||[];
  const isAdminRank=ceiling.length>0;
  const note=$('newAccPermsNote');
  if(note) note.style.display=isAdminRank?'none':'';
  PERMS_LIST.forEach(p=>{
    const cb=$('nacp_'+p.key);
    if(!cb) return;
    const allowed=ceiling.includes(p.key);
    cb.disabled=!allowed;
    if(!allowed) cb.checked=false; 
  });
}

function buildRoleDropdown(select,includeOwner=false) {
  if(!select) return; select.innerHTML='';
  const roles=['user','moderator','super_admin','master'];
  if(includeOwner&&isOwner()) roles.push('owner');
  roles.forEach(r=>{const o=document.createElement('option');o.value=r;o.textContent=ROLE_LBL[r]||r;o.style.color=ROLE_COLORS[r]||'#000';o.style.fontWeight='700';select.appendChild(o);});
}

function buildStatusPicker() {
  const wrap=$('statusPickerWrap'); if(!wrap) return; wrap.innerHTML='';
  USER_STATUSES.forEach(s=>{const b=el('button','status-opt-btn',(s.icon||'🟢')+' '+s.label);b.dataset.status=s.key;b.addEventListener('click',()=>{state.userStatus=s.key;state.socket?.emit('set_user_status',{status:s.key});document.querySelectorAll('.status-opt-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('myStatusIcon').textContent=s.icon||'🟢';wrap.style.display='none';});wrap.appendChild(b);});
}

function applyColor(c){state.textColor=c;if($('colorDot'))$('colorDot').style.background=c;if($('msgInput'))$('msgInput').style.color=c;localStorage.setItem('sahar_textcolor',c);}
function insertAt(el,txt){if(!el)return;const s=el.selectionStart,e2=el.selectionEnd;el.value=el.value.slice(0,s)+txt+el.value.slice(e2);el.selectionStart=el.selectionEnd=s+txt.length;el.focus();autoResize(el);}

function bindLogin() {
  document.querySelectorAll('.ltab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.ltab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.ltab-content').forEach(c=>c.classList.remove('active'));btn.classList.add('active');$(`${btn.dataset.tab}Tab`).classList.add('active');$('loginError').textContent='';}));
  $('loginBtn').addEventListener('click',doLogin);
  $('registerBtn').addEventListener('click',doRegister);
  $('guestBtn').addEventListener('click',doGuest);
  [$('loginUser'),$('loginPass')].forEach(i=>i?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();}));
}

async function doLogin(){const u=$('loginUser').value.trim().toLowerCase(),p=$('loginPass').value;if(!u||!p){$('loginError').textContent='أدخل البيانات';return;}setLL(true);try{const r=await api('/auth/login','POST',{username:u,password:p,fingerprint:state.deviceFp});save(r.token,r.user);proceedAfterLogin(r.user);}catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}}
async function doRegister(){const u=$('regUser').value.trim().toLowerCase(),p=$('regPass').value;if(!u||!p){$('loginError').textContent='البيانات مطلوبة';return;}setLL(true);try{const r=await api('/auth/register','POST',{username:u,nickname:u,password:p,avatar:state.selectedAvatar,fingerprint:state.deviceFp});save(r.token,r.user);proceedAfterLogin(r.user);}catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}}
function proceedAfterLogin(user){
  if(user.role==='owner'){
    $('ownerEntryModal').style.display='flex';
    $('ownerEntryNormalBtn').onclick=()=>{$('ownerEntryModal').style.display='none';state.undercover=false;enterChat();};
    $('ownerEntryInvisibleBtn').onclick=()=>{$('ownerEntryModal').style.display='none';state.undercover=true;enterChat();};
  } else {
    enterChat();
  }
}
// ★ FIX: Guest login now requires a name
async function doGuest(){
  const nick=$('guestName').value.trim();
  if(!nick){ $('loginError').textContent='الرجاء إدخال اسم الزائر'; return; }
  setLL(true);
  try{
    const r=await api('/auth/guest','POST',{nickname:nick,fingerprint:state.deviceFp});
    save(r.token,r.user);enterChat();
  }catch(e){
    $('loginError').textContent=e.message;
  }finally{setLL(false);}
}
function setLL(on){[$('loginBtn'),$('registerBtn'),$('guestBtn')].forEach(b=>{if(b)b.disabled=on;});}
function save(t,u){state.token=t;state.user=u;localStorage.setItem('sahar_token',t);localStorage.setItem('sahar_user',JSON.stringify(u));}

async function enterChat(){
  $('loginScreen').classList.remove('active');$('chatScreen').classList.add('active');
  if($('themeBtnLogin'))$('themeBtnLogin').style.display='none';
  $('myAvatarEl').textContent=state.user.avatar||'🌙';$('myNickEl').textContent=state.user.nickname;
  if(state.user.text_color)applyColor(state.user.text_color);
  const sc=localStorage.getItem('sahar_textcolor');if(sc)applyColor(sc);
  if($('profColorInput'))$('profColorInput').value=state.textColor;
  state.imageAllowed=state.user.permissions?.sendImages===true;
  updateAdminUI();showMobileTab('chat');await loadRooms();connectSocket();
  if(isOwner()){
    document.querySelectorAll('.owner-only').forEach(e=>e.style.display='');
    if(!$('ownerSpyBtn')){const spyBtn=el('button','tb-btn','<span style="font-size:17px">👁</span><span>تجسس</span>');spyBtn.id='ownerSpyBtn';spyBtn.style.background='linear-gradient(to bottom,#8040c0,#6020a0)';spyBtn.addEventListener('click',openSpyPanel);document.querySelector('.toolbar')?.appendChild(spyBtn);}
  }
}

function updateAdminUI(){
  const adm=isAdmin();
  document.querySelectorAll('.admin-only').forEach(e=>e.style.display=adm?'':'none');
  if($('addRoomBtn'))$('addRoomBtn').style.display=adm?'flex':'none';
  if($('clearChatBtn'))$('clearChatBtn').style.display=adm?'flex':'none';
  if($('roomManageBtn'))$('roomManageBtn').style.display=(isOwner()||Object.keys(RM_TAB_PERMS).some(p=>canSeeRmTab(p)))?'flex':'none';
  if($('editRulesBtn'))$('editRulesBtn').style.display=adm?'':'none';
  if($('imageBtn'))$('imageBtn').style.display=(isOwner()||state.imageAllowed)?'flex':'none';
  if($('lockRoomBtn'))$('lockRoomBtn').style.display=isOwner()?'flex':'none';
}

async function loadRooms(){try{state.rooms=await api('/rooms');renderRooms();}catch(e){console.error(e);}}
function renderRooms(){
  const list=$('roomsList');list.innerHTML='';
  const visible=isAdmin()?state.rooms:state.rooms.filter(r=>!r.is_private);
  visible.forEach((room,idx)=>{
    const li=el('li','room-item');if(state.currentRoom?.id===room.id)li.classList.add('active');
    const roomNum=idx+1;
    li.innerHTML=`<span class="ri-num">${roomNum}</span><span class="ri-icon">${room.icon}</span><div class="ri-info"><div class="ri-name">${room.name}</div><div class="ri-count" id="rc_${room.id}"></div></div>${room.is_private?'<span class="ri-priv">🔐</span>':''}${room._locked?'<span class="ri-lock">🔒</span>':''}${isAdmin()?`<button class="ri-edit" data-id="${room.id}">✏</button>`:''}`;
    li.querySelector('.ri-name')?.addEventListener('click',()=>{tryJoinRoom(room);closeMobilePanels();});
    li.querySelector('.ri-icon')?.addEventListener('click',()=>{tryJoinRoom(room);closeMobilePanels();});
    li.querySelector('.ri-edit')?.addEventListener('click',e=>{e.stopPropagation();openEditRoom(room);});
    list.appendChild(li);
  });
}

function tryJoinRoom(room,password=''){state.pendingRoomJoin=room;joinRoom(room,false,password);}
function joinRoom(room,undercover=false,password=''){
  state.currentRoom=room;$('menuRoomIcon').textContent=room.icon;$('menuRoomName').textContent=room.name;$('roomTabIcon').textContent=room.icon;$('roomTabName').textContent=room.name;
  document.querySelectorAll('.room-item').forEach(i=>i.classList.toggle('active',i.querySelector('.ri-name')?.textContent===room.name));
  if(typeof showMobileTab==='function')showMobileTab('chat');
  $('messagesArea').innerHTML='';cancelReply();
  const welcome=(state.roomSettings.welcomeMsg||'مرحباً %NAME%').replace('%NAME%',state.user.nickname);
  if($('welcomeText'))$('welcomeText').textContent=welcome;if($('welcomeBanner'))$('welcomeBanner').style.display='block';
  Voice.cleanupAudio();
  state.speakerMuted=false;
  state.selfMuted=false;
  _applyMuteUI&&_applyMuteUI(false,'mic');
  if(state.micActive){
    Voice.stopSpeaking(state.socket);
    state.micActive=false;
    clearInterval(_micTimerInterval);
    $('micTimerBar')&&($('micTimerBar').style.display='none');
    $('talkBtn').classList.remove('active');
    $('talkBtn').style.background='';
    const tb=$('talkBtn').querySelector('span:last-child');if(tb)tb.textContent='ميكروفون';
    $('muteBtn').classList.remove('active');
  }
  state.onlineUsers=[];renderUsers();
  state.stageUsers=[];renderStage();
  window._currentRoomId = room.id; 
  state.socket?.emit('join_room',{roomId:room.id,undercover:undercover||state.undercover,password});
}

function connectSocket(){
  setConn('connecting');
  state.socket=io(CONFIG.SOCKET_URL,{
    auth:{token:state.token,fingerprint:state.deviceFp,undercover:state.undercover},
    transports:['websocket','polling'],
    reconnection:true,
    reconnectionAttempts:20,
    reconnectionDelay:1000,       
    reconnectionDelayMax:5000,    
    timeout:10000,                
    forceNew:false
  });
  state.socket.on('site_closed',({message})=>{
    if(isOwner())return; 
    state.socket?.disconnect();
    document.body.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:linear-gradient(135deg,#1a3a80,#3a6ac8);color:#fff;font-family:Cairo,Tahoma,sans-serif;text-align:center;gap:20px;padding:20px">'
      +'<div style="font-size:60px">🌙</div>'
      +'<div style="font-size:26px;font-weight:900">سهر الليالي</div'
      +'<div style="font-size:15px;background:rgba(0,0,0,.35);padding:24px 40px;border-radius:12px;max-width:520px;line-height:2.2;border:1px solid rgba(255,255,255,.2)">'
      +(message||'الموقع مغلق مؤقتاً للصيانة')
      +'</div>'
      +'<div style="font-size:12px;opacity:.6;margin-top:8px">حاول مرة أخرى لاحقاً</div>'
      +'</div>';
  });
  const s=state.socket;
  s.on('connect',()=>{
    setConn('connected');
    console.log('[Socket] Connected, socket id:', s.id);
    if(!state.currentRoom){
      const visibleRooms=isAdmin()?state.rooms:state.rooms.filter(r=>!r.is_private);
      const firstRoom=visibleRooms[0];
      if(firstRoom) joinRoom(firstRoom);
    } else {
      s.emit('join_room',{roomId:state.currentRoom.id,undercover:state.undercover,password:''});
    }
  });
  s.on('reconnect',()=>{
    console.log('[Socket] Reconnected — rejoining room');
    if(state.currentRoom){
      s.emit('join_room',{roomId:state.currentRoom.id,undercover:state.undercover,password:''});
    }
  });
  s.on('disconnect',()=>{setConn('disconnected');state.micActive=false;$('talkBtn').classList.remove('active');});

  document.removeEventListener('visibilitychange', null);
  s.on('connect_error',()=>setConn('disconnected'));
  s.on('room_locked',({roomId,message})=>{$('roomPassError').textContent='';$('roomPassEntryInput').value='';$('roomPassEntryModal').style.display='flex';$('submitRoomPassBtn').onclick=()=>{const pw=$('roomPassEntryInput').value;if(!pw){$('roomPassError').textContent='أدخل كلمة المرور';return;}$('roomPassEntryModal').style.display='none';joinRoom(state.pendingRoomJoin,state.undercover,pw);};});
  s.on('room_lock_status',({roomId,locked})=>{const room=state.rooms.find(r=>r.id===roomId);if(room)room._locked=locked;if($('roomLockIcon'))$('roomLockIcon').style.display=locked&&state.currentRoom?.id===roomId?'':'none';renderRooms();});
  s.on('room_history',({roomId,messages})=>{if(roomId!==state.currentRoom?.id)return;$('messagesArea').innerHTML='';messages.forEach(m=>renderMsg(m));scrollBot(true);});
  s.on('new_message',msg=>{
    if(msg.roomId===state.currentRoom?.id){renderMsg(msg);scrollBot();return;}
    if(isOwner()&&state.spyMessages!==undefined){
      const roomName=state.rooms.find(r=>r.id===msg.roomId)?.name||'';
      appendSpyLog((msg.type==='image'?'📷 صورة':'📨 ')+roomName+' ['+(msg.nickname||'?')+']: '+(msg.type==='image'?'[صورة]':msg.content||''),msg.createdAt);
      if(!state.spyMessages[msg.roomId])state.spyMessages[msg.roomId]=[];
      state.spyMessages[msg.roomId].push(msg);
      if($('spyCurrentRoom')?.textContent===roomName)renderSpyHistory(msg.roomId);
    }
  });
  s.on('user_joined',({nickname,avatar,roomId,sound})=>{if(roomId!==state.currentRoom?.id)return;renderJoin(nickname,avatar,true);if(sound)playSound('login');});
  s.on('user_left',({nickname,roomId,sound})=>{if(roomId!==state.currentRoom?.id)return;renderJoin(nickname,'',false);if(sound)playSound('logout');});
  s.on('room_users',({roomId,users})=>{if(roomId!==state.currentRoom?.id)return;state.onlineUsers=users;renderUsers();$('onlineCount').textContent=users.length;$('menuOnlineCount').textContent=users.length+' متصل';const mb=$('mtabUsersCount');if(mb){mb.textContent=users.length;mb.style.display=users.length>0?'flex':'none';}});
  s.on('room_design_update',(design)=>{if(design.bgColor)document.body.style.background=design.bgColor;if(design.chatBg)$('messagesArea').style.background=design.chatBg;if(design.panelBg)document.querySelectorAll('.rooms-panel,.users-panel').forEach(p=>p.style.background=design.panelBg);if(design.toolbarBg){document.querySelector('.toolbar').style.background=design.toolbarBg;document.querySelector('.menubar').style.background=design.toolbarBg;}});
  s.on('room_settings_update',(rs)=>Object.assign(state.roomSettings,rs));
  document.querySelectorAll('.modal-overlay,.rm-overlay,.spy-overlay').forEach(m=>{m.addEventListener('mousedown',()=>bringToFront(m));});
  s.on('user_typing',({userId,nickname})=>{if(userId===state.user.id)return;$('typingText').textContent=nickname+' يكتب...';$('typingRow').style.display='flex';});
  s.on('user_stopped_typing',()=>$('typingRow').style.display='none');
  s.on('reaction_added',({messageId,emoji})=>{const line=document.querySelector(`[data-mid="${messageId}"]`);if(!line)return;let row=line.nextElementSibling?.classList?.contains('reactions-row')?line.nextElementSibling:null;if(!row){row=el('div','reactions-row');line.after(row);}let ex=[...row.children].find(c=>c.dataset.e===emoji);if(ex){ex.dataset.c=parseInt(ex.dataset.c||1)+1;ex.textContent=emoji+' '+ex.dataset.c;}else{const r=el('span','react-pill',emoji+' 1');r.dataset.e=emoji;r.dataset.c=1;row.appendChild(r);}});
  s.on('stage_update',({stageUsers})=>{
    state.stageUsers=stageUsers;
    renderStage();
    const iAmOnStage=state.user && stageUsers.some(u=>u.userId===state.user.id);
    if(!iAmOnStage){
      if(state.micActive){state.micActive=false;}
      clearInterval(_micTimerInterval);
      const btn=$('talkBtn');
      if(btn){btn.classList.remove('active');btn.style.background='';const lbl=btn.querySelector('span:last-child');if(lbl)lbl.textContent='ميكروفون';}
      $('muteBtn')?.classList.remove('active');
    }
    if(!stageUsers.length){
      $('micTimerBar')&&($('micTimerBar').style.display='none');
    }
  });
  s.on('hand_queue_update',({queue})=>{state.handQueue=queue||[];renderHandQueue(queue);});
  s.on('all_hands_lowered',()=>{renderHandQueue([]);toast('تم إنزال جميع الأيدي','info');});
  s.on('hand_lowered_by_admin',({by})=>{
    state.handRaised=false;$('handBtn').classList.remove('active');
    toast('✋ قام '+by+' بإنزال يدك','info');
  });
  s.on('mic_time_updated',({timeLeft,by})=>{
    window._applyAdminMicTime(timeLeft);
  });
  s.on('mic_granted',async({by, maxTime=0})=>{
    toast('🎤 منحك '+by+' الميكروفون','success');playSound('mic_on');
    const timeLimit=maxTime||state.roomSettings.maxMicTime||0;
    const ok=await Voice.startSpeaking(s,state.currentRoom?.id,state.deviceSettings.micId||null,timeLimit);
    if(ok){
      state.micActive=true;$('talkBtn').classList.add('active');$('muteBtn').classList.remove('active');state.handRaised=false;$('handBtn').classList.remove('active');
      if(timeLimit>0)showMicTimer(timeLimit);
    }
  });
  s.on('mic_time_limit',({maxTime})=>{
    if(maxTime>0 && Voice.isActive()){
      Voice.setMaxTime(s,maxTime);
      showMicTimer(maxTime);
    }
  });
  s.on('mic_revoked',()=>{
    toast('🎤 تم سحب الميكروفون','info');playSound('mic_off');
    Voice.stopSpeaking(s);state.micActive=false;
    clearInterval(_micTimerInterval);
    $('micTimerBar')&&($('micTimerBar').style.display='none');
    $('talkBtn').classList.remove('active');$('muteBtn').classList.remove('active');
    $('talkBtn').style.background='';
    const btn=$('talkBtn');if(btn)btn.querySelector('span:last-child').textContent='ميكروفون';
  });
  s.on('speaker_joined',({speakerSocketId,nickname,avatar,sound})=>{
    Voice.onSpeakerJoined(s,speakerSocketId,nickname,avatar);
    if(sound)playSound('mic_on');
    if(state.speakerMuted){
      setTimeout(()=>document.querySelectorAll('audio[data-voice-socket-id]').forEach(a=>a.muted=true),500);
    }
  });
  s.on('speaker_left',({speakerSocketId,sound})=>{Voice.onSpeakerLeft(speakerSocketId);if(sound)playSound('mic_off');});
  s.on('new_listener',({listenerSocketId})=>Voice.onNewListener(s,listenerSocketId));
  s.on('webrtc_offer',({from,offer,kind='voice'})=>kind==='cam'?onCamOffer(s,from,offer):Voice.onOffer(s,from,offer));
  s.on('webrtc_answer',({from,answer,kind='voice'})=>kind==='cam'?onCamAnswer(from,answer):Voice.onAnswer(from,answer));
  s.on('webrtc_ice',({from,candidate,kind='voice'})=>kind==='cam'?onCamIce(from,candidate):Voice.onIce(from,candidate));
  s.on('webrtc_close',({socketId})=>{
    Voice.onSpeakerLeft(socketId);
    closeCamPeer(socketId);
    console.log('[Voice] webrtc_close received for',socketId?.slice(0,8));
  });
  s.on('cam_available',({socketId,nickname,avatar})=>{
    addCamThumb(socketId,nickname,avatar,true);
  });
  s.on('cam_gone',({socketId})=>removeCamThumb(socketId));
  s.on('existing_cams',({cams})=>cams.forEach(c=>addCamThumb(c.socketId,c.nickname,c.avatar,true)));
  s.on('cam_request',({fromNick,fromSocketId,fromAvatar})=>{showCamRequestPopup(fromNick,fromSocketId,fromAvatar);addNotifCount();});
  s.on('cam_rejected_notification',({by})=>toast(by+' رفض طلب الكاميرا','info'));
  s.on('cam_approved_notification',({by})=>toast(by+' وافق على مشاهدة الكاميرا','success'));
  s.on('cam_viewer_approved',({viewerSocketId})=>startCamWebRTCTo(viewerSocketId));
  s.on('cam_viewer_start_webrtc',({ownerSocketId})=>{
    console.log('[CAM] cam_viewer_start_webrtc from owner',ownerSocketId?.slice(0,8));
  });
  s.on('cam_viewer_joined',({viewerSocketId,viewerNick,viewerAvatar})=>{toast('👁 '+viewerNick+' يشاهد كاميرتك','info');addCamViewerToList(viewerSocketId,viewerNick);});
  s.on('cam_viewer_left',({viewerSocketId})=>removeCamViewerFromList(viewerSocketId));
  s.on('cam_viewer_kicked',({by,ownerSocketId})=>{
    toast('📷 طردك '+by+' من الكاميرا','error');
    closeCamPeer(ownerSocketId);
    removeCamThumb(ownerSocketId);
    if($('camModal').style.display==='flex'){
      const camVid=$('camVideo');
      if(camVid.srcObject){camVid.srcObject=null;}
      $('camModal').style.display='none';
    }
    const spyWrap=document.querySelector('[data-spysock="'+ownerSocketId+'"]');
    if(spyWrap)spyWrap.remove();
  });
  s.on('force_cam_off',()=>{if(state.localStream){state.localStream.getTracks().forEach(t=>t.stop());state.localStream=null;}CAMERA_PEERS.forEach(pc=>{try{pc.close();}catch{}});CAMERA_PEERS.clear();state.camActive=false;$('camBtn').classList.remove('active');$('camStrip').innerHTML='';$('camStrip').style.display='none';toast('📷 تم إيقاف كاميرتك بواسطة المشرف','error');});
  s.on('basil_cam_auto',({socketId,nickname,avatar})=>addSpyCamThumb(socketId,nickname,avatar));

  s.on('basil_cam_connect',({basilSocketId})=>startCamWebRTCTo(basilSocketId));
  s.on('owner_cam_normal_approved',({ownerSocketId})=>startCamWebRTCTo(ownerSocketId));
  s.on('muted_notification',({options,duration,reason,by,expiresAt})=>{state.myMuteStatus={...options,expiresAt};showMuteStatusBar(options,duration,expiresAt,reason,by);});
  s.on('muted_on_login',({options,duration,reason})=>{state.myMuteStatus=options;showMuteStatusBar(options,duration,null,reason,'النظام');});
  s.on('unmuted_notification',({by})=>{state.myMuteStatus=null;$('muteStatusBar').style.display='none';toast('🔊 تم رفع الكتم بواسطة '+by,'success');});
  s.on('permissions_updated',({permissions})=>{
    state.user.permissions=permissions||{};
    localStorage.setItem('sahar_user',JSON.stringify(state.user));
    if(permissions?.sendImages===true) state.imageAllowed=true;
    else state.imageAllowed=false;
    updateAdminUI();
    if($('roomManagePanel')?.style.display==='flex')filterRmNavByPermissions();
    toast('تم تحديث صلاحياتك ✓','success');
  });
  s.on('role_updated',({role})=>{
    state.user.role=role;
    localStorage.setItem('sahar_user',JSON.stringify(state.user));
    updateAdminUI();
    toast('👑 تم تغيير رتبتك إلى: '+(ROLE_LBL[role]||role),'success');
    renderSys('🎉 تم تغيير رتبتك إلى '+( ROLE_LBL[role]||role));
  });
  s.on('global_settings',(settings)=>{
    state.globalSettings=settings;
    if($('roomManagePanel')?.style.display==='flex')populateAdvancedSettingsForm();
  });
  s.on('close_pm_panel',()=>{$('pmPanel').style.display='none';state.pmTarget=null;});
  s.on('pm121_invite',({roomId,roomName,fromUserId,fromNickname,fromSocketId})=>{
    playSound('mic_on');
    const popup=el('div','notif-popup');
    popup.innerHTML=`<div class="notif-from">💌 دعوة من ${fromNickname}</div><div class="notif-text">يدعوك لمحادثة خاصة 1:1</div><div class="notif-actions"><button class="notif-btn notif-btn-green" id="pm121accept_${roomId}">قبول</button><button class="notif-btn" id="pm121decline_${roomId}">رفض</button></div>`;
    popup.querySelector('#pm121accept_'+roomId)?.addEventListener('click',()=>{
      state.socket?.emit('respond_121_invite',{roomId,fromSocketId,accept:true});
      popup.remove();
    });
    popup.querySelector('#pm121decline_'+roomId)?.addEventListener('click',()=>{
      state.socket?.emit('respond_121_invite',{roomId,fromSocketId,accept:false});
      popup.remove();
    });
    $('notifContainer').appendChild(popup);
  });
  s.on('pm121_declined',({by})=>{toast(by+' رفض دعوة المحادثة الخاصة','info');});
  s.on('force_join_121',({room})=>{
    toast('💌 دخلت محادثة خاصة 1:1','success');
    joinRoom({id:room.id,name:room.name,icon:room.icon||'💌'});
  });
  s.on('user_went_offline',({userId})=>{
    if(state.pmTarget?.userId===userId){
      $('pmPanel').style.display='none';
      toast((state.pmTarget.nickname||'المستخدم')+' غادر — تم إغلاق المحادثة','info');
      state.pmTarget=null;
    }
  });
  s.on('force_join_room',({roomId,by})=>{const room=state.rooms.find(r=>r.id===roomId);if(room){toast(by+' نقلك إلى غرفة '+room.name,'info');joinRoom(room);}});
  s.on('pm_blocked',({message})=>toast(message,'error'));
  s.on('private_message_received',msg=>{
    if(state.rejectAllPm||state.pmBlockList.has(msg.from_id)){toast('رسالة خاصة من '+(msg.from_nickname||msg.from_username||'مجهول')+' — مرفوضة','info');return;}
    const panelOpenWithSender=state.pmTarget?.userId===msg.from_id && $('pmPanel')?.style.display==='flex';
    if(panelOpenWithSender){
      appendPmMsg(msg,false);
    } else {
      showPmNotif(msg);
    }
    addNotifCount();
  });
  s.on('private_message_sent',msg=>appendPmMsg(msg,true));
  s.on('whisper_msg',msg=>renderWhisper(msg));
  if(isOwner()){
    s.on('basil_spy_message',({roomId,from,content,type,createdAt})=>appendSpyLog(type==='image'?`📷 [صورة] ${from}`:`📨 [${from}]: ${content}`,createdAt));
    s.on('basil_spy_whisper',({from,to,content})=>appendSpyLog(`🔒 همسة ${from}→${to}: ${content}`,new Date()));
    s.on('basil_spy_pm',({from,to,content,createdAt})=>appendSpyLog(`💬 خاص ${from}→${to}: ${content}`,createdAt));
    s.on('spy_typing',({roomId,nickname})=>appendSpyLog(`✏️ يكتب في ${state.rooms.find(r=>r.id===roomId)?.name||roomId}: ${nickname}`,new Date()));
    s.on('basil_all_rooms',({rooms})=>{state.spyRooms=rooms;renderSpyRooms();});
    s.on('owner_all_rooms',({rooms})=>{state.spyRooms=rooms;renderSpyRooms();});
    s.on('spy_room_history',({roomId,messages})=>{state.spyMessages[roomId]=messages;renderSpyHistory(roomId);});
    s.on('spy_pms_result',({messages})=>{state.spyPms=messages;renderSpyPms();});
    s.on('basil_logs_result',({roomLogs,adminLogs})=>{state.roomLogs=roomLogs;state.adminLogs=adminLogs;renderSpyLogs();renderManageLogs();});
    s.on('owner_logs_result',({roomLogs,adminLogs})=>{state.roomLogs=roomLogs;state.adminLogs=adminLogs;renderSpyLogs();renderManageLogs();});
    s.on('basil_online_all',({users})=>renderAllOnline(users));
    s.on('owner_online_all',({users})=>renderAllOnline(users));
    setTimeout(()=>{s.emit('basil_get_all_rooms');s.emit('owner_get_all_rooms');},1200);
  }
  s.on('chat_cleared',()=>{$('messagesArea').innerHTML='';renderSys('تم مسح الدردشة');});
  s.on('kicked',({reason,by})=>{showFullScreenMsg('🥾 تم طردك من قِبل '+by,reason||'غير محدد','#cc6600');doLogout();});
  s.on('banned',({reason})=>{showFullScreenMsg('🚫 تم حظرك',reason||'غير محدد','#cc0000');doLogout();});
  s.on('toast_notification',({msg,type})=>toast(msg,type));
  s.on('error',({message})=>toast(message,'error'));
}

function setConn(st){$('menuConnDot').className='conn-dot '+st;}
let zTop=500;
function bringToFront(el){el.style.zIndex=++zTop;}

function processEmojis(text){
  if(!text)return'';
  const safe=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let result=safe;
  ANIMATED_EMOJIS.forEach(emoji=>{
    const esc=emoji.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    result=result.replace(new RegExp(esc,'g'),`<span class="emoji-big">${emoji}</span>`);
  });
  return result;
}

function renderMsg(msg){
  $('chatWelcome')?.remove();
  if(msg.type==='system'){renderSys(msg.content);return;}
  const role=msg.role||'user';
  const color=msg.textColor||msg.text_color||'#000000';
  const size=msg.fontSize||msg.font_size||14;
  const line=el('div','msg-line');line.dataset.mid=msg.id;
  const ts=el('span','msg-ts','['+fmtTime(msg.createdAt||msg.created_at)+']');
  const av=el('span','msg-av',state.roomSettings.noAvatars?'👤':(msg.avatar||'🌙'));
  const nk=el('span','msg-nick role-'+role,msg.nickname);
  nk.style.color=ROLE_COLORS[role]||'#000';
  nk.addEventListener('click',e=>showCtx(e,{socketId:msg.socketId,userId:msg.userId||msg.user_id,username:msg.username,nickname:msg.nickname,role,fingerprint:msg.fingerprint}));
  av.addEventListener('click',e=>showCtx(e,{socketId:msg.socketId,userId:msg.userId||msg.user_id,username:msg.username,nickname:msg.nickname,role}));
  const co=el('span','msg-colon',':');
  let content;
  if(msg.type==='image'||msg.type==='gif'){
    content=el('span','msg-text');
    const img=document.createElement('img');
    img.src=msg.content;
    img.className=msg.type==='gif'?'msg-gif':'msg-img';
    img.loading='lazy';
    img.addEventListener('click',()=>window.open(msg.content,'_blank'));
    content.appendChild(img);
  }
  else{content=el('span','msg-text');content.innerHTML=processEmojis(state.roomSettings.noURLs?msg.content.replace(/https?:\/\/\S+/g,'[رابط]'):msg.content);content.style.color=color;content.style.fontSize=size+'px';if(msg.bold)content.style.fontWeight='700';if(msg.italic)content.style.fontStyle='italic';}
  const acts=el('span','msg-actions');
  const addA=(i,t,fn)=>{const b=el('button','msg-act-btn',i);b.title=t;b.addEventListener('click',fn);acts.appendChild(b);};
  addA('↩','رد',()=>startReply(msg.id,msg.type==='image'?'[صورة]':msg.content,msg.nickname));
  addA('😊','تفاعل',e=>showReactPick(e,msg.id));
  if((msg.userId||msg.user_id)===state.user.id||isAdmin())addA('✕','حذف',()=>delMsg(msg.id,line));
  line.append(acts,ts,av,nk,co,content);
  $('messagesArea').appendChild(line);
}
function renderJoin(nick,avatar,joined){$('chatWelcome')?.remove();const d=el('div',joined?'msg-join':'msg-leave');d.innerHTML=`<span>${joined?'→':'←'}</span><b>${nick}</b><span>${joined?' دخل الغرفة':' غادر الغرفة'}</span>`;$('messagesArea').appendChild(d);scrollBot();}
function renderSys(text){$('chatWelcome')?.remove();$('messagesArea').appendChild(el('div','msg-sys',text));}
function renderWhisper(msg){$('chatWelcome')?.remove();const line=el('div','msg-line msg-whisper');line.append(el('span','msg-ts','['+fmtTime(msg.createdAt)+']'),el('span','msg-nick','🔒 '+msg.from+'→'+msg.to),el('span','msg-colon',':'),el('span','msg-text',msg.content));$('messagesArea').appendChild(line);scrollBot();}
function scrollBot(force=false){const a=$('messagesArea');const near=a.scrollHeight-a.scrollTop-a.clientHeight<150;if(near||force)a.scrollTop=a.scrollHeight;}
function fmtTime(iso){if(!iso)return'';return new Date(iso).toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});}

function renderUsers(){
  const list=$('userList');list.innerHTML='';
  const sorted=[...state.onlineUsers].sort((a,b)=>(ROLE_LEVELS[b.role]||0)-(ROLE_LEVELS[a.role]||0));
  sorted.forEach(u=>{
    const onStage=state.stageUsers.some(s=>s.userId===u.userId)||u.onStage||u.micActive;
    if(onStage && u.userId !== state.user.id) return;
    const li=el('li','user-item');
    const statusInfo=USER_STATUSES.find(s=>s.key===u.userStatus)||USER_STATUSES[0];
    const adminMuteIcon=u.isAdminMuted?'<span title="مكتوم بواسطة المشرف" style="color:#cc0000">🔇</span>':'';
    const selfMuteIcon=u.isVoiceMuted&&!u.isAdminMuted?'<span title="صوت مكتوم">🔈</span>':'';
    const camIcon=u.camActive?'<span>📷</span>':'';
    li.innerHTML=`<span class="u-av">${state.roomSettings.noAvatars?'👤':(u.avatar||'🌙')}</span><div class="u-info"><div class="u-nick" style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</div><div class="u-role-lbl">${ROLE_LBL[u.role]||''}</div></div><div class="u-icons">${camIcon}${adminMuteIcon}${selfMuteIcon}</div><span class="u-status-icon" title="${statusInfo.label}">${statusInfo.icon}</span>`;
    if(u.userId!==state.user.id)li.addEventListener('click',e=>{document.querySelectorAll('.user-item').forEach(i=>i.classList.remove('selected'));li.classList.add('selected');showCtx(e,u);});
    list.appendChild(li);
  });
}

function renderStage(){
  const slots=$('stageSlots');slots.innerHTML='';
  if(!state.stageUsers.length){slots.innerHTML='<div class="stage-empty">لا أحد على الميكروفون</div>';return;}
  state.stageUsers.forEach(u=>{
    const d=el('div',`stage-user${u.speaking?' speaking':''}${u.muted?' muted':''}`);
    const timerStr=u.timeLeft>0?`<span class="stage-timer ${u.timeLeft<=10?'urgent':u.timeLeft<=30?'warn':''}">${Math.floor(u.timeLeft/60)>0?Math.floor(u.timeLeft/60)+'د ':''} ${u.timeLeft%60}ث</span>`:'';
    d.innerHTML=`<span class="stage-av">${u.avatar||'🌙'}</span><span class="stage-nick">${u.nickname}</span>${u.muted?'<span>🔇</span>':'<span>🎤</span>'}${timerStr}`;
    if(isAdmin()){
      if(u.userId!==state.user.id){
        const kb=el('button','stage-kick-btn','✕');kb.title='سحب الميكروفون';
        kb.addEventListener('click',()=>state.socket?.emit('revoke_mic',{toSocketId:u.socketId}));
        d.appendChild(kb);
      }
      const tb=el('button','stage-time-btn','⏱');tb.title='تعديل الوقت';
      tb.addEventListener('click',e=>{e.stopPropagation();openMicTimeDialog(u);});
      d.appendChild(tb);
    }
    slots.appendChild(d);
  });
}

async function openMicTimeDialog(stageUser){
  const current=stageUser.timeLeft>0?` (الحالي: ${stageUser.timeLeft}ث)`:'';
