/* سهر الليالي v7.4 — Full Client */
const CONFIG = {
  API_URL:    window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com',
  SOCKET_URL: window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com'
};

// ── Theme system ─────────────────────────────────────────────────────
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
const isAdmin  = () => ['owner','master','pink_master','super_admin','moderator'].includes(state.user?.role);

const ROLE_LEVELS = { guest:0, user:1, moderator:2, super_admin:3, master:4, pink_master:4, owner:5 };
const ROLE_LBL    = { owner:'👑 مالك', master:'🌟 ماستر', pink_master:'🌸 ماستر ', super_admin:'⚡ سوبر أدمن', moderator:'🛡️ مشرف', user:'👤 عضو', guest:'🔓 زائر' };
const ROLE_COLORS = { owner:'#8b0000', master:'#8b4513', pink_master:'#FF1493', super_admin:'#6a0dad', moderator:'#00008b', user:'#1a5a1a', guest:'#4a4a6a' };
const RANK_PERMS_MAX = {
  guest:       [],
  user:        [],
  moderator:   ['blockMachine','muteUsers','kickout','banUsers','sortMicList','clearText','broadcast','unban','viewLog','sendImages','dragToRoom'],
  super_admin: ['blockMachine','muteUsers','kickout','banUsers','sortMicList','clearText','broadcast','unban','viewLog','manageAccounts','manageMembers','manageAdmins','sendImages','dragToRoom','roomSettings','adminReports','profilePic','invite121'],
  master:      ['blockMachine','muteUsers','kickout','banUsers','sortMicList','clearText','broadcast','unban','viewLog','manageAccounts','manageMembers','manageAdmins','manageSuperAdmins','sendImages','dragToRoom','roomSettings','adminReports','profilePic','machineLock','invite121'],
  pink_master: ['blockMachine','muteUsers','kickout','banUsers','sortMicList','clearText','broadcast','unban','viewLog','manageAccounts','manageMembers','manageAdmins','manageSuperAdmins','sendImages','dragToRoom','roomSettings','adminReports','profilePic','machineLock','invite121'],
};
const RANK_PERMS = RANK_PERMS_MAX; 

const AVATARS    = ['🌙','⭐','🌟','💫','🌸','🌺','🦋','🐉','🦁','🐺','🦊','🐻','🦅','🌊'];
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
  {key:'blockMachine',label:'حظر الأجهزة'},{key:'muteUsers',label:'كتم المستخدمين'},{key:'kickout',label:'طرد'},{key:'banUsers',label:'حظر المستخدمين'},{key:'sortMicList',label:'ترتيب قائمة الميك'},{key:'clearText',label:'مسح النص'},{key:'broadcast',label:'بث رسالة'},{key:'unban',label:'رفض الحظر'},{key:'viewLog',label:'عرض السجل'},{key:'manageAccounts',label:'إدارة الحسابات'},{key:'manageMembers',label:'إدارة الأعضاء'},{key:'manageAdmins',label:'إدارة المشرفين'},{key:'manageSuperAdmins',label:'إدارة السوبر أدمن'},{key:'manageMasters',label:'إدارة الماستر'},{key:'roomSettings',label:'إعدادات الغرفة'},{key:'adminReports',label:'تقارير الإدارة'},{key:'sendImages',label:'إرسال الصور'},{key:'dragToRoom',label:'نقل مستخدمين بين الغرف'},{key:'profilePic',label:'رفع صورة شخصية'},{key:'machineLock',label:'قفل الجهاز'},{key:'invite121',label:'دعوة لمحادثة خاصة 1:1'},
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
  const roles=['user','moderator','super_admin','master','pink_master'];
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
  if(state.socket){
    try { state.socket.removeAllListeners(); state.socket.disconnect(); } catch(e){}
    state.socket = null;
  }
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
      +'<div style="font-size:26px;font-weight:900">سهر الليالي</div>'
      +'<div style="font-size:15px;background:rgba(0,0,0,.35);padding:24px 40px;border-radius:12px;max-width:520px;line-height:2.2;border:1px solid rgba(255,255,255,.2)">'
      +(message||'الموقع مغلق مؤقتاً للصيانة')
      +'</div>'
      +'<div style="font-size:12px;opacity:.6;margin-top:8px">حاول مرة أخرى لاحقاً</div>'
      +'</div>';
  });
  const s=state.socket;
  s.on('connect',()=>{
    setConn('connected');
    if(!state.currentRoom){
      const visibleRooms=isAdmin()?state.rooms:state.rooms.filter(r=>!r.is_private);
      const firstRoom=visibleRooms[0];
      if(firstRoom) joinRoom(firstRoom);
    } else {
      s.emit('join_room',{roomId:state.currentRoom.id,undercover:state.undercover,password:''});
    }
  });
  s.on('reconnect',()=>{
    if(state.currentRoom){
      s.emit('join_room',{roomId:state.currentRoom.id,undercover:state.undercover,password:''});
    }
  });
  s.on('disconnect',()=>{setConn('disconnected');state.micActive=false;$('talkBtn').classList.remove('active');});

  document.removeEventListener('visibilitychange', null);
  
  s.on('connect_error', (err) => {
    if (err && err.message && !err.message.includes('transport') && !err.message.includes('xhr poll error')) {
      $('loginError').textContent = err.message;
      doLogout();
    } else {
      setConn('disconnected');
    }
  });
  
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
  s.on('pm121_declined',({by})=>toast(by+' رفض دعوة المحادثة الخاصة','info'));
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
  if(msg.type==='system'){
    // ★ FIX: Pass msg.textColor to renderSys
    renderSys(msg.content, msg.textColor);
    return;
  }
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
// ★ FIX: renderSys accepts color and applies it
function renderSys(text, color){
  $('chatWelcome')?.remove();
  const sysEl = el('div','msg-sys',text);
  if(color) sysEl.style.color = color;
  $('messagesArea').appendChild(sysEl);
}
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
    
    // ★ FIX: Added individual mute signs for Text, Voice, Cam, and PM
    let muteIcons = '';
    if(u.muteText) muteIcons += '<span title="مكتوم نصياً" style="color:#cc0000">📝</span>';
    if(u.muteVoice) muteIcons += '<span title="مكتوم صوتياً" style="color:#cc0000">🔇</span>';
    if(u.muteCam) muteIcons += '<span title="مكتوم كاميرا" style="color:#cc0000">📷</span>';
    if(u.mutePm) muteIcons += '<span title="مكتوم خاص" style="color:#cc0000">✉️</span>';
    const camIcon=u.camActive?'<span title="كاميرا مفتوحة">🎥</span>':'';
    
    li.innerHTML=`<span class="u-av">${state.roomSettings.noAvatars?'👤':(u.avatar||'🌙')}</span><div class="u-info"><div class="u-nick" style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</div><div class="u-role-lbl">${ROLE_LBL[u.role]||''}</div></div><div class="u-icons">${camIcon}${muteIcons}</div><span class="u-status-icon" title="${statusInfo.label}">${statusInfo.icon}</span>`;
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
    d.innerHTML=`<span class="stage-av">${u.avatar||'🌙')}</span><span class="stage-nick">${u.nickname}</span>${u.muted?'<span>🔇</span>':'<span>🎤</span>'}${timerStr}`;
    if(isAdmin()){
      if(u.userId!==state.user.id && u.role !== 'owner'){
        const kb=el('button','stage-kick-btn','✕');kb.title='سحب الميكروفون';
        kb.addEventListener('click',()=>state.socket?.emit('revoke_mic',{toSocketId:u.socketId}));
        d.appendChild(kb);
      }
      if(u.role !== 'owner') {
        const tb=el('button','stage-time-btn','⏱');tb.title='تعديل الوقت';
        tb.addEventListener('click',e=>{e.stopPropagation();openMicTimeDialog(u);});
        d.appendChild(tb);
      }
    }
    slots.appendChild(d);
  });
}

async function openMicTimeDialog(stageUser){
  const current=stageUser.timeLeft>0?` (الحالي: ${stageUser.timeLeft}ث)`:''; 
  const rankTimes=state.roomSettings.rankTimes||{};
  const rankDefault=rankTimes[stageUser.role]||0;
  const hint=rankDefault>0?`\nالافتراضي لرتبته: ${rankDefault}ث`:'';
  const secs=await showPrompt(`تعديل وقت ${stageUser.nickname}${current}${hint}\n\nأدخل الثواني المتبقية (0 = بلا حد):`,'','⏱ تعديل وقت الميكروفون');
  if(secs===null)return; 
  const val=Math.max(0,parseInt(secs)||0);
  state.socket?.emit('update_mic_time',{targetSocketId:stageUser.socketId,timeLeft:val});
}
function renderHandQueue(queue){
  const sec=$('handSection'),list=$('handList');
  if(!queue.length){sec.style.display='none';return;}
  sec.style.display='block';list.innerHTML='';
  queue.forEach(u=>{
    const d=el('div','hand-item','✋ '+u.nickname);
    if(isAdmin()){
      const b=el('button','hand-approve','✓ منح');b.addEventListener('click',()=>state.socket?.emit('grant_mic',{toSocketId:u.socketId,toNickname:u.nickname}));d.appendChild(b);
    }
    list.appendChild(d);
  });
  if(isAdmin()){const allBtn=el('button','rm-btn rm-btn-red','إنزال الكل');allBtn.style.cssText='font-size:10px;padding:3px 8px;margin-top:4px;width:100%';allBtn.addEventListener('click',()=>state.socket?.emit('lower_all_hands'));list.appendChild(allBtn);}
}

function addCamThumb(socketId,nickname,avatar,showReqBtn=false){
  const strip=$('camStrip');strip.style.display='flex';
  if(strip.querySelector(`[data-csock="${socketId}"]`))return;
  const th=el('div','cam-thumb');th.dataset.csock=socketId;
  const v=document.createElement('video');v.autoplay=true;v.playsInline=true;
  const lb=el('div','cam-thumb-name',nickname);
  const vl=el('div','cam-viewers-list');
  th.appendChild(v);th.appendChild(lb);th.appendChild(vl);
  if(showReqBtn){
    const rb=el('button','cam-req-btn','👁 مشاهدة');
    rb.addEventListener('click',e=>{
      e.stopPropagation();
      state.socket?.emit('request_cam',{toSocketId:socketId,toNickname:nickname});
      toast('تم إرسال طلب المشاهدة','info');
    });
    th.appendChild(rb);
    if(isOwner()){
      const spyBtn=el('button','cam-spy-btn','👁‍🗨');
      spyBtn.title='تجسس (بدون موافقة)';
      spyBtn.addEventListener('click',e=>{
        e.stopPropagation();
        addSpyCamThumb(socketId,nickname,avatar);
      });
      th.appendChild(spyBtn);
    }
  }
  th.addEventListener('click',()=>{
    if(v.srcObject){
      $('camVideo').srcObject=v.srcObject;
      $('camModalTitle').textContent='📷 '+nickname;
      $('camModal').style.display='flex';
      bringToFront($('camModal'));
    } else if(showReqBtn){
      state.socket?.emit('request_cam',{toSocketId:socketId,toNickname:nickname});
      toast('جاري طلب الكاميرا...','info');
    }
  });
  strip.appendChild(th);
}
function removeCamThumb(socketId){closeCamPeer(socketId);const th=$('camStrip').querySelector(`[data-csock="${socketId}"]`);if(th)th.remove();if(!$('camStrip').children.length)$('camStrip').style.display='none';}
function addCamViewerToList(viewerSocketId,viewerNick){
  const th=document.getElementById('myLocalCam');if(!th)return;
  let vl=th.querySelector('.cam-viewers-list');if(!vl){vl=el('div','cam-viewers-list');th.appendChild(vl);}
  if(vl.querySelector(`[data-vsid="${viewerSocketId}"]`))return;
  const vi=el('div','cam-viewer-item',viewerNick+' ');vi.dataset.vsid=viewerSocketId;
  const kb=el('button','cam-kick-viewer','✕ طرد');kb.addEventListener('click',()=>{state.socket?.emit('kick_cam_viewer',{viewerSocketId});vi.remove();});
  vi.appendChild(kb);vl.appendChild(vi);
}
function removeCamViewerFromList(viewerSocketId){document.querySelector(`[data-vsid="${viewerSocketId}"]`)?.remove();}
function addSpyCamThumb(socketId,nickname,avatar){
  const grid=$('spyCamGrid');if(!grid)return;
  if(grid.querySelector(`[data-spysock="${socketId}"]`))return;
  const wrap=el('div','spy-cam-wrap');wrap.dataset.spysock=socketId;
  const v=document.createElement('video');v.autoplay=true;v.playsInline=true;
  v.style.cssText='width:220px;height:165px;border-radius:6px;background:#111;border:2px solid #5500aa;object-fit:cover;cursor:pointer';
  const lb=el('div','spy-cam-label',(nickname||'')+'  ');
  const closeBtn=el('button','spy-cam-close','✕');
  closeBtn.style.cssText='position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:11px;padding:1px 5px';
  closeBtn.addEventListener('click',()=>{closeCamPeer(socketId);wrap.remove();});
  wrap.style.position='relative';
  wrap.appendChild(v);wrap.appendChild(lb);wrap.appendChild(closeBtn);grid.appendChild(wrap);
  v.addEventListener('click',()=>{
    if(!v.srcObject)return;
    $('camVideo').srcObject=v.srcObject;
    $('camModalTitle').textContent='👁‍🗨 تجسس: '+(nickname||'');
    $('camModal').style.display='flex';bringToFront($('camModal'));
  });
  state.socket?.emit('request_cam',{toSocketId:socketId,toNickname:nickname});
}

const CAM_ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},{urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'}]};

async function startCamWebRTCTo(toSocketId){if(!state.localStream)return;closeCamPeer(toSocketId);const pc=new RTCPeerConnection(CAM_ICE);CAMERA_PEERS.set(toSocketId,pc);state.localStream.getTracks().forEach(t=>pc.addTrack(t,state.localStream));pc.onicecandidate=e=>{if(e.candidate)state.socket?.emit('webrtc_ice',{to:toSocketId,candidate:e.candidate,kind:'cam'});};pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')pc.restartIce();};const offer=await pc.createOffer();await pc.setLocalDescription(offer);state.socket?.emit('webrtc_offer',{to:toSocketId,offer:pc.localDescription,kind:'cam'});}
async function onCamOffer(socket,fromSocketId,offer){closeCamPeer(fromSocketId);const pc=new RTCPeerConnection(CAM_ICE);CAMERA_PEERS.set(fromSocketId,pc);pc.onicecandidate=e=>{if(e.candidate)socket?.emit('webrtc_ice',{to:fromSocketId,candidate:e.candidate,kind:'cam'});};pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')pc.restartIce();};pc.ontrack=e=>{const stream=e.streams?.[0]||new MediaStream([e.track]);showRemoteCam(fromSocketId,stream);};await pc.setRemoteDescription(new RTCSessionDescription(offer));const answer=await pc.createAnswer();await pc.setLocalDescription(answer);socket?.emit('webrtc_answer',{to:fromSocketId,answer:pc.localDescription,kind:'cam'});}
async function onCamAnswer(fromSocketId,answer){const pc=CAMERA_PEERS.get(fromSocketId);if(!pc||pc.signalingState==='stable')return;try{await pc.setRemoteDescription(new RTCSessionDescription(answer));}catch(e){console.warn('[CAM]',e);}}
async function onCamIce(fromSocketId,candidate){const pc=CAMERA_PEERS.get(fromSocketId);if(!pc||!candidate)return;try{await pc.addIceCandidate(new RTCIceCandidate(candidate));}catch{}}
function closeCamPeer(socketId){const pc=CAMERA_PEERS.get(socketId);if(pc){try{pc.close();}catch{}CAMERA_PEERS.delete(socketId);}}
function showRemoteCam(socketId,stream){
  const nick=state.onlineUsers.find(u=>u.socketId===socketId)?.nickname||'كاميرا';
  const spyV=document.querySelector(`[data-spysock="${socketId}"] video`);
  if(spyV){spyV.srcObject=stream;spyV.play?.().catch(()=>{});return;}
  const thumbV=$('camStrip').querySelector(`[data-csock="${socketId}"] video`);
  if(thumbV){
    thumbV.srcObject=stream;thumbV.play?.().catch(()=>{});
    if($('camModal').style.display==='flex'&&$('camModalTitle').textContent.includes(nick)){
      $('camVideo').srcObject=stream;
    }
    return;
  }
  $('camVideo').srcObject=stream;
  $('camModalTitle').textContent='📷 '+nick;
  $('camModal').style.display='flex';bringToFront($('camModal'));
}

// ★ FIX: Unmute option added back
function showCtx(e,target){
  e.preventDefault();e.stopPropagation();
  const menu=$('ctxMenu'),list=$('ctxList');list.innerHTML='';
  const myLevel=ROLE_LEVELS[state.user.role]||0;const targetLevel=ROLE_LEVELS[target.role]||0;
  const adm=isAdmin();
  const own=isOwner();
  const canAct=myLevel>=targetLevel&&!target.isOwner;
  const hasMutePerm=own||(state.user.permissions?.muteUsers===true&&targetLevel<=myLevel&&!target.isOwner);
  const hasKickPerm=own||(state.user.permissions?.kickout===true&&targetLevel<=myLevel&&!target.isOwner);
  const hasBanPerm=own||(state.user.permissions?.banUsers===true&&targetLevel<=myLevel&&!target.isOwner);
  const hasMicPerm=own||state.user.permissions?.sortMicList===true;
  const hasInvite121=own||state.user.permissions?.invite121===true;
  const add=(icon,lbl,fn,cls='')=>{const li=el('li',cls,icon+' '+lbl);if(fn)li.addEventListener('click',()=>{fn();hideCtx();});else li.className='ctx-hdr';list.appendChild(li);};
  const sep=()=>list.appendChild(el('li','ctx-sep'));
  add('',target.nickname,null,'ctx-hdr');
  add('💬','رسالة خاصة',()=>openPm(target));
  if(adm&&target.socketId)add('🔒','همسة',()=>doWhisper(target));
  add('ℹ','معلومات',()=>showUserInfo(target));
  if(hasInvite121&&target.userId!==state.user.id&&target.socketId){
    add('💌','دعوة لمحادثة خاصة 1:1',async ()=>{
      if(await showConfirm('إرسال دعوة محادثة خاصة 1:1 إلى '+target.nickname+'؟','💌 دعوة خاصة')){
        state.socket?.emit('invite_121',{targetSocketId:target.socketId});
      }
    });
  }
  if((hasMutePerm||hasKickPerm||hasBanPerm||hasMicPerm)&&target.userId!==state.user.id){
    sep();
    if(hasMicPerm){
      const onStage=state.stageUsers.some(s=>s.userId===target.userId);
      if(onStage)add('🎤','سحب الميكروفون',()=>state.socket?.emit('revoke_mic',{toSocketId:target.socketId}));
      else{
        const handRaised=(state.handQueue||[]).some(u=>u.socketId===target.socketId);
        add('🎤','منح الميكروفون',()=>{
          if(!handRaised){toast('لا يمكن منح الميكروفون لمن لم يرفع يده','error');return;}
          state.socket?.emit('grant_mic',{toSocketId:target.socketId,toNickname:target.nickname});
        });
      }
    }
    if(hasMutePerm){
      add('🔇','كتم',()=>openMuteDialog(target));
      // ★ FIX: Unmute button is now always visible if user has mute permission
      add('🔊','رفع الكتم',()=>state.socket?.emit('unmute_user',{targetSocketId:target.socketId}));
      add('📷','إيقاف الكاميرا',()=>state.socket?.emit('force_cam_off_target',{targetSocketId:target.socketId}));
    }
    if(state.user.permissions?.dragToRoom===true||own)add('🚪','نقل إلى غرفة',()=>openDragToRoomDialog(target));
    if(hasKickPerm||hasBanPerm)sep();
    if(hasKickPerm){
      add('🥾','طرد',()=>kickUser(target),'ctx-danger');
    }
    if(hasBanPerm){
      add('🚫','حظر',()=>banUser(target),'ctx-danger');
    }
  }
  if(isOwner()&&target.userId!==state.user.id){
    sep();
    add('👁','تتبع في لوحة التجسس',()=>{openSpyPanel();});
  }
  const x=Math.min(e.clientX,window.innerWidth-200);const y=Math.min(e.clientY,window.innerHeight-350);
  menu.style.top=y+'px';menu.style.left=x+'px';menu.style.display='block';bringToFront(menu);
  setTimeout(()=>document.addEventListener('click',hideCtx,{once:true}),0);
}
function hideCtx(){$('ctxMenu').style.display='none';}

async function showUserInfo(target){
  const isGuest=target.userId?.startsWith('guest_')||target.role==='guest';
  if(isGuest||!target.username||target.username?.startsWith('guest_')){
    $('userInfoBody').innerHTML=`
      <div style="text-align:center;font-size:44px;margin-bottom:10px">👤</div>
      <div class="uinfo-row"><span class="uinfo-label">الاسم:</span><b>${target.nickname||'زائر'}</b></div>
      <div class="uinfo-row"><span class="uinfo-label">الرتبة:</span><span style="color:#4a4a6a">🔓 زائر</span></div>
      ${isAdmin()?`<div class="uinfo-row"><span class="uinfo-label">IP:</span><span dir="ltr">${target.ip||'-'}</span></div>
      <div class="uinfo-row"><span class="uinfo-label">الدولة:</span>${target.country||'-'}</div>
      <div class="uinfo-row"><span class="uinfo-label">الجهاز:</span><span dir="ltr" style="font-size:10px">${(target.fingerprint||'-').slice(0,24)}...</span></div>`:''}
    `;
    $('userInfoModal').style.display='flex';bringToFront($('userInfoModal'));return;
  }
  try{
    const u=await api('/users/'+(target.username||'unknown'));
    $('userInfoBody').innerHTML=`
      <div style="text-align:center;font-size:44px;margin-bottom:10px">${u.avatar||'🌙'}</div>
      <div class="uinfo-row"><span class="uinfo-label">الاسم:</span><b>${u.nickname}</b></div>
      <div class="uinfo-row"><span class="uinfo-label">الرتبة:</span><span style="color:${ROLE_COLORS[u.role]||'#000'};font-weight:700">${ROLE_LBL[u.role]||u.role}</span></div>
      ${isAdmin()?`<div class="uinfo-row"><span class="uinfo-label">IP:</span><span dir="ltr">${u.last_ip||target.ip||'-'}</span></div>
      <div class="uinfo-row"><span class="uinfo-label">الدولة:</span>${u.country||target.country||'-'}</div>
      <div class="uinfo-row"><span class="uinfo-label">الجهاز:</span><span dir="ltr" style="font-size:10px">${(u.fingerprint||target.fingerprint||'-').slice(0,24)}...</span></div>`:''}
      <div class="uinfo-row"><span class="uinfo-label">آخر ظهور:</span>${u.last_seen?new Date(u.last_seen).toLocaleString('ar'):'-'}</div>
      <div class="uinfo-row"><span class="uinfo-label">نبذة:</span>${u.bio||'-'}</div>
    `;
    $('userInfoModal').style.display='flex';bringToFront($('userInfoModal'));
  }catch(e){toast('خطأ في تحميل المعلومات','error');}
}
async function openDragToRoomDialog(target){const roomName=await showPrompt('اسم الغرفة:\n'+state.rooms.map(r=>r.name).join('\n'),'','🚪 نقل إلى غرفة');const room=state.rooms.find(r=>r.name===roomName);if(room)state.socket?.emit('drag_user_to_room',{targetSocketId:target.socketId,roomId:room.id});}
async function doWhisper(target){const msg=await showPrompt('همسة إلى '+target.nickname+':','','🔒 همسة');if(msg?.trim())state.socket?.emit('whisper',{toSocketId:target.socketId,toNickname:target.nickname,content:msg.trim()});}
async function kickUser(target){
  if(!target.socketId){toast('المستخدم غير متصل حالياً','error');return;}
  const r=await showPrompt('سبب الطرد:','','🥾 طرد '+target.nickname);
  if(r===null)return; 
  state.socket?.emit('kick_user',{targetSocketId:target.socketId,reason:r});
}

async function banUser(target){
  state.banTarget = target;
  $('banUserAvatar').textContent = target.avatar || '👤';
  $('banUserName').textContent = target.nickname;
  $('banDuration').value = '0'; 
  $('banReason').value = '';
  $('banModal').style.display = 'flex';
  bringToFront($('banModal'));
}

async function doBan(){
  if(!state.banTarget) return;
  const target = state.banTarget;
  const r = $('banReason').value.trim();
  const d = $('banDuration').value;
  const duration = d === '0' ? 0 : parseInt(d); 
  
  $('banModal').style.display = 'none'; 
  
  state.socket?.emit('ban_from_log', {
    nickname: target.nickname,
    ip: target.ip || '',
    fingerprint: target.fingerprint || '',
    reason: r,
    duration: duration,
    targetUserId: target.userId || target.id || null
  });
  
  toast('تم تطبيق الحظر على '+target.nickname, 'success');
  state.banTarget = null;
}

function changeRole(target){
  const dlg=el('div','modal-overlay');dlg.style.cssText='display:flex;z-index:800';
  dlg.innerHTML=`<div class="modal"><div class="modal-tb">👑 تغيير رتبة ${target.nickname}<button class="x-btn" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body"><div class="mfield"><label>اختر الرتبة</label><select id="roleChangeSelect" class="rm-select"></select></div><div style="display:flex;gap:8px;margin-top:8px"><button onclick="doChangeRole('${target.userId}',document.getElementById('roleChangeSelect').value);this.closest('.modal-overlay').remove()" class="rm-btn rm-btn-green full">تغيير</button></div></div></div>`;
  document.body.appendChild(dlg);bringToFront(dlg);
  buildRoleDropdown(dlg.querySelector('#roleChangeSelect'),false);
  const sel=dlg.querySelector('#roleChangeSelect');if(sel&&target.role)sel.value=target.role;
}
async function doChangeRole(userId,role){
  state.socket?.emit('set_role',{targetUserId:userId,role});
  try{await api('/admin/role/'+userId,'PATCH',{role});toast('تم تغيير الرتبة ✓','success');loadAccountsPanel();}
  catch(e){toast('سيتم التغيير عند الاتصال التالي','info');}
}

function openMuteDialog(target){state.muteTarget=target;$('muteUserAvatar').textContent=target.avatar||'👤';$('muteUserName').textContent=target.nickname;$('muteText').checked=true;$('muteVoice').checked=true;$('mutePm').checked=false;$('muteCam').checked=false;$('muteReason').value='';$('muteModal').style.display='flex';bringToFront($('muteModal'));}
function doMute(){if(!state.muteTarget)return;const options={text:$('muteText').checked,voice:$('muteVoice').checked,pm:$('mutePm').checked,cam:$('muteCam').checked};const durVal=$('muteDuration').value;const duration=durVal==='0'?null:parseInt(durVal);const reason=$('muteReason').value;state.socket?.emit('mute_user_advanced',{targetSocketId:state.muteTarget.socketId,options,duration,reason});$('muteModal').style.display='none';state.muteTarget=null;toast('تم الكتم','success');}
function showMuteStatusBar(options,duration,expiresAt,reason,by){const bar=$('muteStatusBar');const types=[options.text?'📝 نص':'',options.voice?'🎤 صوت':'',options.pm?'💬 خاص':'',options.cam?'📷 كاميرا':''].filter(Boolean).join(' | ');let timeStr='دائم';if(expiresAt){const rem=Math.round((new Date(expiresAt)-new Date())/60000);timeStr=rem>0?rem+' دقيقة':'انتهت';}else if(duration){timeStr=duration+' دقيقة';}bar.innerHTML=`🔇 مكتوم: ${types} | المدة: ${timeStr} | بواسطة: ${by}${reason?' | '+reason:''}`;bar.style.display='block';}

function openPermDialog(target){
  state.permTarget=target;
  $('permUserName').textContent=target.nickname+' ('+(ROLE_LBL[target.role]||target.role)+')';
  const container=$('permCheckboxes');
  container.innerHTML='';

  let existing={};
  try{
    if(target.permissions){
      if(typeof target.permissions==='string') existing=JSON.parse(target.permissions)||{};
      else if(typeof target.permissions==='object') existing={...target.permissions};
    }
  }catch{ existing={}; }

  const myLevel   = ROLE_LEVELS[state.user.role]||0;
  const targetLvl = ROLE_LEVELS[target.role]||0;
  const canEdit   = isOwner()||(myLevel>=targetLvl);
  const maxPerms  = RANK_PERMS_MAX[target.role]||PERMS_LIST.map(p=>p.key);

  PERMS_LIST.forEach(p=>{
    const withinRank = Array.isArray(maxPerms)?maxPerms.includes(p.key):true;
    const isGranted  = existing[p.key]===true;
    const editable   = canEdit && withinRank;

    const lbl=document.createElement('label');
    lbl.className='chk-row'+(withinRank?'':' perm-disabled');
    if(!withinRank) lbl.title='خارج نطاق رتبة '+(ROLE_LBL[target.role]||target.role);
    else if(!canEdit) lbl.title='رتبتك غير كافية لتعديل هذه الصلاحية';

    const cb=document.createElement('input');
    cb.type='checkbox'; cb.id='perm_'+p.key;
    cb.checked=isGranted; cb.disabled=!editable;

    const sp=document.createElement('span');
    sp.textContent=p.label;
    sp.style.color=isGranted?'#007700':'';
    sp.style.fontWeight=isGranted?'700':'400';

    cb.addEventListener('change',()=>{
      sp.style.color=cb.checked?'#007700':'';
      sp.style.fontWeight=cb.checked?'700':'400';
      updatePermSummary();
    });

    lbl.appendChild(cb); lbl.appendChild(sp);
    container.appendChild(lbl);
  });

  updatePermSummary();
  $('permModal').style.display='flex';
  bringToFront($('permModal'));
}

function updatePermSummary(){
  const granted=PERMS_LIST.filter(p=>{const cb=$('perm_'+p.key);return cb&&cb.checked;}).map(p=>p.label);
  const s=$('permSummary');if(!s)return;
  if(granted.length){
    s.innerHTML='<span style="color:#007700;font-weight:700">✅ ممنوحة:</span> '+granted.join(' · ');
    s.style.cssText='font-size:11px;padding:6px 8px;background:#f0fff0;border:1px solid #b0d8b0;border-radius:4px;line-height:1.8';
  } else {
    s.innerHTML='<span style="color:#888">⚪ لا توجد صلاحيات ممنوحة</span>';
    s.style.cssText='font-size:11px;padding:6px 8px;background:#f8f8f8;border:1px solid #ddd;border-radius:4px';
  }
}
async function savePermissions(){
  if(!state.permTarget){ toast('خطأ: لا يوجد مستخدم محدد','error'); return; }
  if(!state.permTarget.userId||state.permTarget.userId.startsWith('guest_')){
    toast('لا يمكن تعديل صلاحيات زائر','error'); return;
  }

  const perms={};
  PERMS_LIST.forEach(p=>{
    const cb=$('perm_'+p.key);
    perms[p.key]=cb?cb.checked===true:false;
  });

  try{
    await api('/admin/permissions/'+state.permTarget.userId,'PATCH',{permissions:perms});
    state.socket?.emit('set_permissions',{targetUserId:state.permTarget.userId,permissions:perms});
    state.permTarget.permissions=perms;
    $('permModal').style.display='none';
    toast('تم حفظ الصلاحيات وتطبيقها فوراً ✓','success');
    loadAccountsPanel();
  } catch(e){
    console.error('savePermissions API error:', e);
    if(state.socket?.connected){
      state.socket.emit('set_permissions',{targetUserId:state.permTarget.userId,permissions:perms});
      toast('فشل حفظ API: '+e.message+' — تم الإرسال عبر socket كبديل','error');
    } else {
      toast('فشل حفظ الصلاحيات: '+e.message,'error');
      return; 
    }
    $('permModal').style.display='none';
  }
}

function showCamRequestPopup(fromNick,fromSocketId,fromAvatar){const popup=el('div','notif-popup');popup.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:28px">${fromAvatar||'👤'}</span><div><div class="notif-from">${fromNick}</div><div class="notif-text">يطلب مشاهدة كاميرتك</div></div></div><div class="notif-actions"><button class="notif-btn notif-btn-green" id="ca_${fromSocketId}">✓ قبول</button><button class="notif-btn notif-btn-red" id="cr_${fromSocketId}">✕ رفض</button></div>`;popup.querySelector(`#ca_${fromSocketId}`)?.addEventListener('click',()=>{state.socket?.emit('cam_approved',{toSocketId:fromSocketId});popup.remove();});popup.querySelector(`#cr_${fromSocketId}`)?.addEventListener('click',()=>{state.socket?.emit('cam_rejected',{toSocketId:fromSocketId});popup.remove();});$('notifContainer').appendChild(popup);setTimeout(()=>popup?.remove(),15000);}
function showPmNotif(msg){const popup=el('div','notif-popup');const fromName=msg.from_nickname||msg.from_username||'مجهول';popup.innerHTML=`<div class="notif-from">💬 ${fromName}</div><div class="notif-text">${(msg.content||'').slice(0,60)}</div><div class="notif-actions"><button class="notif-btn notif-btn-green" id="pmreply_${msg.from_id}">رد</button></div>`;popup.querySelector(`#pmreply_${msg.from_id}`)?.addEventListener('click',()=>{openPm({userId:msg.from_id,nickname:fromName,username:msg.from_username});popup.remove();});$('notifContainer').appendChild(popup);setTimeout(()=>popup?.remove(),8000);}
function addNotifCount(){state.notifications++;$('notifCount').textContent=state.notifications;$('notifCount').style.display='';}

async function toggleTalk(){
  if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}
  if(state.myMuteStatus?.voice){toast('🔇 أنت مكتوم صوتياً','error');return;}
  if(state.micActive){
    Voice.stopSpeaking(state.socket);state.micActive=false;
    clearInterval(_micTimerInterval);
    $('micTimerBar')&&($('micTimerBar').style.display='none');
    $('talkBtn').querySelector('span:last-child').textContent='ميكروفون';
    $('talkBtn').style.background='';
    $('talkBtn').classList.remove('active');$('muteBtn').classList.remove('active');
    playSound('mic_off');toast('🎤 تم إيقاف الميكروفون','info');
  } else {
    if(isOwner()||isAdmin()||state.roomSettings.freeMic&&!state.roomSettings.requireHand){
      const rankTimes=state.roomSettings.rankTimes||{};
      const myMaxTime=rankTimes[state.user.role]||state.roomSettings.maxMicTime||0;
      const ok=await Voice.startSpeaking(state.socket,state.currentRoom.id,state.deviceSettings.micId||null,myMaxTime);
      if(ok){state.micActive=true;$('talkBtn').classList.add('active');playSound('mic_on');if(myMaxTime>0)showMicTimer(myMaxTime);}
    } else {
      if(state.handRaised){state.socket?.emit('lower_hand');state.handRaised=false;$('handBtn').classList.remove('active');toast('✋ تم إنزال يدك','info');}
      else{state.socket?.emit('raise_hand');state.handRaised=true;$('handBtn').classList.add('active');toast('✋ تم رفع يدك','info');}
    }
  }
}

async function toggleMuteBtn(){
  const stream=Voice.getStream();
  if(stream){
    const track=stream.getAudioTracks()[0];
    if(track){
      track.enabled=!track.enabled;
      const muted=!track.enabled;
      state.selfMuted=muted; 
      _applyMuteUI(muted, 'mic');
      toast(muted?'🔇 تم كتم الميكروفون':'🔊 رُفع الكتم عن الميكروفون','info');
      state.socket?.emit('speaking',{isSpeaking:false});
      return;
    }
  }
  state.speakerMuted=!state.speakerMuted;
  document.querySelectorAll('audio[data-voice-socket-id]').forEach(a=>a.muted=state.speakerMuted);
  _applyMuteUI(state.speakerMuted, 'speaker');
  toast(state.speakerMuted?'🔇 تم كتم الصوت':'🔊 رُفع الكتم','info');
}

function _applyMuteUI(muted, type){
  const btn=$('muteBtn');
  if(muted){
    btn.classList.add('active');
    btn.style.background='linear-gradient(to bottom,#cc0000,#880000)';
    btn.style.borderColor='#660000';
    btn.querySelector('span:first-child').textContent='🔇';
    btn.querySelector('span:last-child').textContent=type==='mic'?'إلغاء كتم الميك':'إلغاء كتم الصوت';
  } else {
    btn.classList.remove('active');
    btn.style.background='';
    btn.style.borderColor='';
    btn.querySelector('span:first-child').textContent='🔊';
    btn.querySelector('span:last-child').textContent='كتم نفسي';
  }
}

async function toggleCam(){
  if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}
  if(!state.roomSettings.camAllow){toast('الكاميرا غير مسموح بها','error');return;}
  if(state.myMuteStatus?.cam){toast('🔇 أنت ممنوع من الكاميرا','error');return;}
  if(state.roomSettings.whoCan==='members'&&state.user.role==='guest'){toast('الزوار لا يمكنهم فتح الكاميرا','error');return;}
  if(state.camActive){
    state.localStream?.getTracks().forEach(t=>t.stop());state.localStream=null;state.camActive=false;
    CAMERA_PEERS.forEach(pc=>{try{pc.close();}catch{}});CAMERA_PEERS.clear();
    $('camBtn').classList.remove('active');state.socket?.emit('cam_off');
    const myThumb=document.getElementById('myLocalCam');if(myThumb)myThumb.remove();
    if(!$('camStrip').children.length)$('camStrip').style.display='none';
    toast('📷 تم إيقاف الكاميرا','info');
  } else {
    try{
      await navigator.mediaDevices.enumerateDevices();
      const constraints={video:state.deviceSettings.camId?{deviceId:{exact:state.deviceSettings.camId}}:true,audio:false};
      try{
        state.localStream=await navigator.mediaDevices.getUserMedia(constraints);
      }catch(innerErr){
        if(state.deviceSettings.camId&&(innerErr.name==='OverconstrainedError'||innerErr.name==='NotFoundError')){
          state.localStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
        } else throw innerErr;
      }
      state.camActive=true;$('camBtn').classList.add('active');
      state.socket?.emit('cam_on',{roomId:state.currentRoom.id});
      const strip=$('camStrip');strip.style.display='flex';
      let th=document.getElementById('myLocalCam');
      if(!th){th=el('div','cam-thumb');th.id='myLocalCam';const v=document.createElement('video');v.autoplay=true;v.muted=true;v.playsInline=true;const lb=el('div','cam-thumb-name',state.user.nickname+' (أنا)');const vl=el('div','cam-viewers-list');th.appendChild(v);th.appendChild(lb);th.appendChild(vl);th.addEventListener('click',()=>{$('camVideo').srcObject=state.localStream;$('camModalTitle').textContent='📷 أنا';$('camModal').style.display='flex';});strip.insertBefore(th,strip.firstChild);}
      th.querySelector('video').srcObject=state.localStream;
      toast('📷 الكاميرا مفعّلة','success');
    }catch(e){toast('❌ لا يمكن الوصول للكاميرا: '+e.message,'error');}
  }
}

async function openDeviceSettings(){
  $('deviceModal').style.display='flex';bringToFront($('deviceModal'));
  $('deviceMsg').textContent='جاري تحميل الأجهزة...';
  try{
    let tempStream=null;
    try{tempStream=await navigator.mediaDevices.getUserMedia({audio:true,video:true});}catch{}
    const devs=await navigator.mediaDevices.enumerateDevices();
    if(tempStream)tempStream.getTracks().forEach(t=>t.stop());
    const fill=(sel,arr,saved)=>{sel.innerHTML='<option value="">افتراضي</option>';arr.forEach(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||('جهاز '+d.deviceId.slice(0,8));if(d.deviceId===saved)o.selected=true;sel.appendChild(o);});};
    fill($('micSelect'),devs.filter(d=>d.kind==='audioinput'),state.deviceSettings.micId);
    fill($('speakerSelect'),devs.filter(d=>d.kind==='audiooutput'),state.deviceSettings.speakerId);
    fill($('camSelect'),devs.filter(d=>d.kind==='videoinput'),state.deviceSettings.camId);
    $('deviceMsg').textContent='';
  }catch(e){$('deviceMsg').textContent='خطأ: '+e.message;}
}

let micTestStream=null,micTestAnim=null;
async function testMic(){
  if(micTestStream){micTestStream.getTracks().forEach(t=>t.stop());micTestStream=null;cancelAnimationFrame(micTestAnim);$('micTestLevel').style.width='0%';$('testMicBtn').textContent='اختبار الميكروفون';return;}
  try{
    micTestStream=await navigator.mediaDevices.getUserMedia({audio:$('micSelect').value?{deviceId:{exact:$('micSelect').value}}:true,video:false});
    const ctx=new AudioContext();const analyser=ctx.createAnalyser();analyser.fftSize=256;
    ctx.createMediaStreamSource(micTestStream).connect(analyser);
    const data=new Uint8Array(analyser.frequencyBinCount);
    const update=()=>{analyser.getByteFrequencyData(data);const avg=data.reduce((a,b)=>a+b,0)/data.length;$('micTestLevel').style.width=Math.min(avg*2,100)+'%';micTestAnim=requestAnimationFrame(update);};update();
    $('testMicBtn').textContent='إيقاف الاختبار';
  }catch(e){$('deviceMsg').textContent='خطأ: '+e.message;}
}
function saveDeviceSettings(){
  state.deviceSettings.micId=$('micSelect').value;state.deviceSettings.speakerId=$('speakerSelect').value;state.deviceSettings.camId=$('camSelect').value;
  localStorage.setItem('sahar_devices',JSON.stringify(state.deviceSettings));
  if($('speakerSelect').value&&HTMLMediaElement.prototype.setSinkId)document.querySelectorAll('audio,video').forEach(el=>{if(el.setSinkId)el.setSinkId($('speakerSelect').value).catch(()=>{});});
  if(micTestStream){micTestStream.getTracks().forEach(t=>t.stop());micTestStream=null;cancelAnimationFrame(micTestAnim);}
  $('deviceModal').style.display='none';toast('تم حفظ إعدادات الجهاز ✓','success');
}

function sendMsg(){
  const inp=$('msgInput'),content=inp.value.trim();
  if(!content||!state.currentRoom||!state.socket?.connected)return;
  if(state.myMuteStatus?.text){toast('🔇 أنت ممنوع من الكتابة','error');return;}
  state.socket.emit('send_message',{roomId:state.currentRoom.id,content,type:'text',replyTo:state.replyTo,textColor:state.textColor,fontSize:state.fontSize,bold:state.bold,italic:state.italic});
  inp.value='';autoResize(inp);cancelReply();stopTyping();
}
function sendImage(file){
  if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}
  if(state.myMuteStatus?.text){toast('🔇 أنت ممنوع من الإرسال','error');return;}
  const isGif=file.type==='image/gif';
  const maxSize=isGif?4*1024*1024:2*1024*1024;
  if(file.size>maxSize){toast(`الملف كبير جداً (الحد ${isGif?'4':'2'}MB)`,'error');return;}
  const reader=new FileReader();
  reader.onload=e=>state.socket?.emit('send_message',{
    roomId:state.currentRoom.id,
    content:isGif?'[GIF]':'[صورة]',
    type:isGif?'gif':'image',
    imageData:e.target.result,
    replyTo:null,textColor:'#000000',fontSize:14,bold:false,italic:false
  });
  reader.readAsDataURL(file);
}
function startReply(mid,content,nick){state.replyTo=mid;$('replySnippet').textContent=nick+': '+content.slice(0,60);$('replyBar').style.display='flex';$('msgInput').focus();}
function cancelReply(){state.replyTo=null;$('replyBar').style.display='none';}
async function delMsg(mid,lineEl){if(!await showConfirm('حذف الرسالة؟','🗑 حذف رسالة'))return;try{await api('/messages/'+mid,'DELETE');lineEl.querySelector('.msg-text').textContent='[تم حذف هذه الرسالة]';lineEl.querySelector('.msg-text').style.cssText='color:#aaa;font-style:italic';}catch(e){toast(e.message,'error');}}
function showReactPick(e,mid){e.stopPropagation();const q=['❤️','😂','😍','👏','🔥','😢','😡','👍','🌹','💯'];document.querySelector('.qr-pick')?.remove();const p=el('div','qr-pick');p.style.cssText=`position:fixed;background:#eef1f7;border:1px solid #a0b0d0;border-radius:3px;padding:5px 8px;display:flex;gap:4px;z-index:800;box-shadow:2px 2px 6px rgba(0,0,0,.3);top:${e.clientY-38}px;left:${e.clientX-80}px;`;q.forEach(emoji=>{const b=el('span','emoji-item',emoji);b.style.fontSize='20px';b.addEventListener('click',()=>{state.socket?.emit('add_reaction',{messageId:mid,roomId:state.currentRoom?.id,emoji});p.remove();});p.appendChild(b);});document.body.appendChild(p);setTimeout(()=>document.addEventListener('click',()=>p.remove(),{once:true}),0);}
function startTyping(){if(!state.isTyping&&state.currentRoom){state.isTyping=true;state.socket?.emit('typing_start',{roomId:state.currentRoom.id});}clearTimeout(state.typingTimer);state.typingTimer=setTimeout(stopTyping,2500);}
function stopTyping(){if(state.isTyping&&state.currentRoom){state.isTyping=false;state.socket?.emit('typing_stop',{roomId:state.currentRoom.id});}clearTimeout(state.typingTimer);}

function openPm(target){
  if(!target||(!target.userId&&!target.id)){toast('لا يمكن فتح رسالة خاصة','error');return;}
  state.pmTarget={...target,userId:target.userId||target.id};
  $('pmTitle').textContent='💬 '+(target.nickname||target.username||'مجهول');
  $('pmMsgs').innerHTML='';$('pmPanel').style.display='flex';bringToFront($('pmPanel'));
  if(!state.pmTarget.userId?.startsWith('guest_')){api('/messages/private/'+state.pmTarget.userId).then(msgs=>{msgs.forEach(m=>appendPmMsg(m,m.from_id===state.user.id));$('pmMsgs').scrollTop=$('pmMsgs').scrollHeight;}).catch(()=>{});}
}
function appendPmMsg(msg,sent){
  if(!msg)return;
  const d=el('div','pm-msg '+(sent?'sent':'recv'));
  const fromName=sent?'أنا':(msg.from_nickname||msg.from_username||'مجهول');
  const f=el('div','pm-msg-from',fromName);d.appendChild(f);
  d.appendChild(document.createTextNode(msg.content||''));
  $('pmMsgs').appendChild(d);$('pmMsgs').scrollTop=$('pmMsgs').scrollHeight;
}
function sendPm(){
  const c=$('pmInput').value.trim();if(!c||!state.pmTarget)return;
  if(state.myMuteStatus?.pm){toast('🔇 أنت ممنوع من الرسائل الخاصة','error');return;}
  state.socket?.emit('private_message',{toUserId:state.pmTarget.userId,toUsername:state.pmTarget.username||state.pmTarget.nickname||'',content:c});
  $('pmInput').value='';
}

function openAddRoom(){state.editingRoom=null;$('roomModalTitle').textContent='إضافة غرفة';$('roomName').value='';$('roomDesc').value='';$('roomPrivate').checked=false;$('deleteRoomBtn').style.display='none';$('roomMsg').textContent='';state.selectedRoomIcon='💬';$('roomIconGrid').querySelectorAll('.ri-opt').forEach(o=>o.classList.toggle('selected',o.textContent==='💬'));if($('roomOrderField'))$('roomOrderField').style.display='none';$('roomModal').style.display='flex';bringToFront($('roomModal'));}
function openEditRoom(room){state.editingRoom=room;$('roomModalTitle').textContent='تعديل الغرفة';$('roomName').value=room.name;$('roomDesc').value=room.description||'';$('roomPrivate').checked=room.is_private;$('deleteRoomBtn').style.display='';$('roomMsg').textContent='';state.selectedRoomIcon=room.icon||'💬';$('roomIconGrid').querySelectorAll('.ri-opt').forEach(o=>o.classList.toggle('selected',o.textContent===room.icon));
  if($('roomOrderField')){$('roomOrderField').style.display='';$('roomOrder').value=state.rooms.findIndex(r=>r.id===room.id)+1;}
  $('roomModal').style.display='flex';bringToFront($('roomModal'));}
async function saveRoom(){
  const name=$('roomName').value.trim(),desc=$('roomDesc').value.trim(),priv=$('roomPrivate').checked,icon=state.selectedRoomIcon;
  if(!name){$('roomMsg').textContent='الاسم مطلوب';$('roomMsg').className='info-msg error';return;}
  if(!state.token){$('roomMsg').textContent='يجب تسجيل الدخول أولاً';$('roomMsg').className='info-msg error';return;}
  $('roomMsg').textContent='جاري الحفظ...';
  try{
    if(state.editingRoom&&state.editingRoom.id){
      await api('/rooms/'+state.editingRoom.id,'PATCH',{name,description:desc,icon,is_private:priv});
      const newPos=parseInt($('roomOrder')?.value);
      const oldPos=state.rooms.findIndex(r=>r.id===state.editingRoom.id)+1;
      if(newPos&&newPos!==oldPos){
        await api('/rooms/'+state.editingRoom.id+'/reorder','PATCH',{position:newPos});
      }
    } else {
      await api('/rooms','POST',{name,description:desc,icon,is_private:priv});
    }
    $('roomModal').style.display='none';await loadRooms();toast('تم حفظ الغرفة ✓','success');
  }catch(e){
    $('roomMsg').textContent=e.message||'فشل الاتصال — تحقق من اتصال الخادم';
    $('roomMsg').className='info-msg error';
    console.error('saveRoom error:',e);
  }
}
async function deleteRoom(){if(!await showConfirm('حذف هذه الغرفة؟','🗑 حذف الغرفة'))return;try{await api('/rooms/'+state.editingRoom.id,'DELETE');$('roomModal').style.display='none';if(state.currentRoom?.id===state.editingRoom.id){state.currentRoom=null;$('messagesArea').innerHTML='';}await loadRooms();toast('تم حذف الغرفة','success');}catch(e){toast(e.message,'error');}}
async function openRules(){if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}try{const r=await api('/rooms/'+state.currentRoom.id);$('rulesDisplay').textContent=r.rules||'';$('rulesEdit').value=r.rules||'';}catch{}$('rulesEdit').style.display='none';$('saveRulesBtn').style.display='none';$('rulesModal').style.display='flex';bringToFront($('rulesModal'));}
async function saveRules(){try{await api('/rooms/'+state.currentRoom.id,'PATCH',{rules:$('rulesEdit').value});$('rulesDisplay').textContent=$('rulesEdit').value;$('rulesEdit').style.display='none';$('saveRulesBtn').style.display='none';toast('تم حفظ القواعد ✓','success');}catch(e){toast(e.message,'error');}}

function openProfile(){const u=state.user;$('profAvatarBig').textContent=u.avatar||'🌙';$('profNick').value=u.nickname||'';$('profBio').value=u.bio||'';$('profColorInput').value=state.textColor;$('profColorPreview').textContent=state.textColor;state.selectedAvatar=u.avatar||'🌙';$('profileAvatarGrid').querySelectorAll('.av-opt').forEach(o=>o.classList.toggle('selected',o.textContent===state.selectedAvatar));$('profileModal').style.display='flex';bringToFront($('profileModal'));$('profMsg').textContent='';}
async function saveProfile(){try{const textColor=$('profColorInput').value;const u=await api('/users/me/profile','PATCH',{nickname:$('profNick').value.trim(),bio:$('profBio').value.trim(),avatar:state.selectedAvatar,text_color:textColor});state.user={...state.user,...u};localStorage.setItem('sahar_user',JSON.stringify(state.user));$('myAvatarEl').textContent=state.user.avatar;$('myNickEl').textContent=state.user.nickname;applyColor(textColor);$('profMsg').textContent='تم الحفظ ✓';$('profMsg').className='info-msg success';}catch(e){$('profMsg').textContent=e.message;$('profMsg').className='info-msg error';}}
async function changePass(){const c=$('curPass').value,n=$('newPass').value;if(!c||!n){$('profMsg').textContent='أدخل كلمتي المرور';$('profMsg').className='info-msg error';return;}try{await api('/users/me/password','PATCH',{currentPassword:c,newPassword:n});$('curPass').value='';$('newPass').value='';$('profMsg').textContent='تم التغيير ✓';$('profMsg').className='info-msg success';}catch(e){$('profMsg').textContent=e.message;$('profMsg').className='info-msg error';}}

const RM_TAB_PERMS = {
  general:   ['roomSettings','manageAccounts'],
  accounts:  ['manageAccounts'],
  banned:    ['unban','banUsers'],
  voice:     ['roomSettings'],
  webcam:    ['roomSettings'],
  design:    ['roomSettings'],
  sounds:    ['roomSettings'],
  rooms:     ['roomSettings','manageAccounts'],
  logs:      'owner',
  adminlogs: 'owner',
  allusers:  'owner',
  loginattempts: 'owner',
  advanced:  'owner',
};
function canSeeRmTab(panel){
  if(isOwner())return true;
  const req=RM_TAB_PERMS[panel];
  if(req==='owner')return false;
  if(!req||!req.length)return true;
  return req.some(p=>state.user.permissions?.[p]===true);
}
function filterRmNavByPermissions(){
  let firstVisible=null;
  document.querySelectorAll('.rm-nav-item[data-panel]').forEach(item=>{
    const visible=canSeeRmTab(item.dataset.panel);
    item.style.display=visible?'':'none';
    if(visible&&!firstVisible)firstVisible=item.dataset.panel;
  });
  const activeItem=document.querySelector('.rm-nav-item.active');
  if(!activeItem||activeItem.style.display==='none'){
    if(firstVisible)switchRmPanel(firstVisible);
  }
}
function openRoomManage(){$('roomManagePanel').style.display='flex';bringToFront($('roomManagePanel'));filterRmNavByPermissions();loadAccountsPanel();}
function switchRmPanel(name){
  document.querySelectorAll('.rm-nav-item').forEach(i=>i.classList.toggle('active',i.dataset.panel===name));
  document.querySelectorAll('.rm-panel').forEach(p=>p.classList.remove('active'));
  const panel=$('rmp-'+name);if(panel)panel.classList.add('active');
  if(name==='accounts')loadAccountsPanel();
  if(name==='banned')loadBannedPanel();
  if(name==='logs'||name==='adminlogs'){state.socket?.emit('basil_get_logs');state.socket?.emit('owner_get_logs');renderManageLogs();}
  if(name==='rooms')loadRoomsPanel();
  if(name==='voice')populateVoiceSettingsForm();
  if(name==='webcam')populateWebcamSettingsForm();
  if(name==='advanced'){populateAdvancedSettingsForm();state.socket?.emit('get_global_settings');loadSiteCloseAllowedList();}
  if(name==='allusers'){state.socket?.emit('basil_get_online_all');state.socket?.emit('owner_get_online_all');}
  if(name==='loginattempts')loadLoginAttempts();
}

async function loadAccountsPanel(){
  try{
    const users=await api('/admin/users');
    const q=($('accountSearch')?.value||'').toLowerCase();
    const filtered=users.filter(u=>u.nickname.toLowerCase().includes(q)||u.username.includes(q));
    const body=$('accountsBody');body.innerHTML='';
    let members=0,mods=0,admins=0,masters=0;
    filtered.forEach(u=>{
      if(u.role==='master'||u.role==='pink_master')masters++;else if(u.role==='super_admin')admins++;else if(u.role==='moderator')mods++;else members++;
      const tr=document.createElement('tr');
      const permJson=JSON.stringify(u.permissions||{}).replace(/'/g,"\'").replace(/"/g,'&quot;');
      const isLocked=!!u.locked_fingerprint;
      const canHoldPerms=(RANK_PERMS_MAX[u.role]||[]).length>0;
      const permsBtn=canHoldPerms
        ? `<button class="rm-btn" onclick="window._openPerm('${u.id}','${u.nickname}','${u.role}')">صلاحيات</button>`
        : '';
      const lockBtn=isOwner()||state.user.permissions?.machineLock===true
        ? (isLocked
            ? `<button class="rm-btn" onclick="unlockUserMachine('${u.id}','${u.nickname}')">🔓 فك القفل</button>`
            : `<button class="rm-btn" onclick="lockUserMachine('${u.id}','${u.nickname}','${(u.fingerprint||'').replace(/'/g,'')}')">🔒 قفل الجهاز</button>`)
        : '';
      tr.innerHTML=`<td><b style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</b><br><small>${u.username}</small>${isLocked?' <span title="الجهاز مقفل">🔒</span>':''}</td>
      <td><span style="color:${ROLE_COLORS[u.role]||'#000'};font-weight:700">${ROLE_LBL[u.role]||u.role}</span></td>
      <td>${u.status==='online'?'🟢':'⚫'} ${u.status||'offline'}</td>
      <td dir="ltr" style="font-size:10px">${u.last_ip||'-'}</td>
      <td>${u.country||'-'}</td>
      <td style="white-space:nowrap">
        <button class="rm-btn" onclick="changeRole({userId:'${u.id}',nickname:'${u.nickname}',role:'${u.role}'})">رتبة</button>
        ${permsBtn}
        ${lockBtn}
        <button class="rm-btn rm-btn-red" onclick="confirmDeleteUser('${u.id}','${u.nickname}')">حذف</button>
      </td>`;
      tr.dataset.userid=u.id;
      tr.dataset.perms=JSON.stringify(u.permissions||{});
      body.appendChild(tr);
    });
    $('cntMembers').textContent=members;$('cntMods').textContent=mods;$('cntAdmins').textContent=admins;
    if($('cntMasters'))$('cntMasters').textContent=masters;$('cntTotal').textContent=filtered.length;
  }catch(e){toast('خطأ في تحميل الحسابات: '+e.message,'error');}
}
window._openPerm = function(userId, nickname, role) {
  const row=document.querySelector(`[data-userid="${userId}"]`);
  let permissions={};
  if(row&&row.dataset.perms){try{permissions=JSON.parse(row.dataset.perms);}catch{}}
  openPermDialog({userId,nickname,role,permissions});
};

async function lockUserMachine(userId,nickname,knownFingerprint){
  let fp=knownFingerprint;
  if(!fp){
    toast(nickname+' لم يسجل الدخول بعد — لا توجد بصمة جهاز لقفلها. اطلب منه الدخول مرة واحدة ثم حاول مجدداً','error');
    return;
  }
  if(!await showConfirm('قفل جهاز '+nickname+' الحالي؟ لن يتمكن من الدخول من جهاز آخر.','🔒 قفل الجهاز')) return;
  try{
    await api('/admin/machine-lock/'+userId,'POST',{fingerprint:fp,lock:true});
    state.socket?.emit('lock_user_machine',{targetUserId:userId,targetFingerprint:fp});
    toast('تم قفل الجهاز ✓','success');
    loadAccountsPanel();
  }catch(e){toast('فشل قفل الجهاز: '+e.message,'error');}
}
async function unlockUserMachine(userId,nickname){
  if(!await showConfirm('رفع قفل الجهاز عن '+nickname+'؟','🔓 فك القفل'))return;
  try{
    await api('/admin/machine-lock/'+userId,'POST',{lock:false});
    state.socket?.emit('unlock_user_machine',{targetUserId:userId});
    toast('تم رفع قفل الجهاز ✓','success');
    loadAccountsPanel();
  }catch(e){toast('فشل رفع القفل: '+e.message,'error');}
}

async function confirmDeleteUser(userId,nickname){if(!await showConfirm('حذف المستخدم '+nickname+'؟','🗑 حذف المستخدم'))return;try{await api('/admin/users/'+userId,'DELETE');toast('تم الحذف ✓','success');loadAccountsPanel();}catch(e){toast(e.message,'error');}}
async function loadBannedPanel(){try{const bans=await api('/admin/bans');const body=$('bannedBody');body.innerHTML='';bans.forEach(b=>{const tr=document.createElement('tr');const rem=b.expires_at?new Date(b.expires_at).toLocaleString('ar'):'دائم';tr.innerHTML=`<td>${b.users?.nickname||'-'}</td><td dir="ltr" style="font-size:9px">${b.fingerprint||b.ip||'-'}</td><td>-</td><td>${b.reason||'-'}</td><td>${new Date(b.created_at).toLocaleString('ar')}</td><td>${rem}</td><td><button class="rm-btn rm-btn-green" onclick="unbanUser('${b.id}')">رفع</button></td>`;body.appendChild(tr);});}catch(e){console.error(e);}}
async function unbanUser(banId){try{await api('/admin/ban/'+banId,'DELETE');toast('تم رفع الحظر','success');loadBannedPanel();}catch(e){toast(e.message,'error');}}
function loadRoomsPanel(){const body=$('roomsBody');body.innerHTML='';state.rooms.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r.icon}</td><td><b>${r.name}</b>${r.is_private?' 🔐':''}</td><td>${r.description||'-'}</td><td>${r.is_private?'✓':''}</td><td>${r._locked?'🔒':'لا'}</td><td><button class="rm-btn" onclick="openEditRoom(state.rooms.find(x=>x.id==='${r.id}'))">تعديل</button>${isOwner()?`<button class="rm-btn" onclick="openRoomLockDialog('${r.id}')">🔒</button>`:''}`;body.appendChild(tr);});
  loadOneOnOnePanel();
}
async function loadLoginAttempts(){
  const body=$('loginAttemptsBody');if(!body)return;
  try{
    const rows=await api('/admin/login-attempts');
    body.innerHTML='';
    if(!rows.length){body.innerHTML='<tr><td colspan="6" style="color:#888">لا توجد محاولات دخول مسجلة</td></tr>';return;}
    rows.forEach(r=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><b>${r.username}</b></td><td dir="ltr" style="font-size:10px">${r.ip||'-'}</td><td>${r.country||'-'}</td>
        <td>${r.success?'✅ نجح':'❌ فشل'}</td><td style="font-size:10px">${new Date(r.created_at).toLocaleString('ar')}</td>
        <td><button class="rm-btn rm-btn-red" style="font-size:9px;padding:2px 6px" onclick="deleteLoginAttempt('${r.id}')">🗑</button></td>`;
      body.appendChild(tr);
    });
  }catch(e){console.error(e);}
}
async function deleteLoginAttempt(id){
  try{await api('/admin/login-attempts/'+id,'DELETE');loadLoginAttempts();}
  catch(e){toast('فشل الحذف: '+e.message,'error');}
}
async function loadOneOnOnePanel(){
  const section=$('oneOnOneSection');if(!section)return;
  if(!isOwner()){section.style.display='none';return;}
  section.style.display='';
  try{
    const rooms=await api('/rooms/1on1');
    const body=$('oneOnOneBody');if(!body)return;body.innerHTML='';
    if(!rooms.length){body.innerHTML='<tr><td colspan="3" style="color:#888">لا توجد محادثات خاصة حالياً</td></tr>';return;}
    rooms.forEach(r=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${r.icon||'💌'} ${r.name}</td><td>${new Date(r.created_at).toLocaleString('ar')}</td>
        <td>
          <button class="rm-btn" onclick="joinRoom({id:'${r.id}',name:'${r.name.replace(/'/g,"")}',icon:'${r.icon||'💌'}'},true);$('roomManagePanel').style.display='none';">👁 دخول متخفي</button>
          <button class="rm-btn rm-btn-red" onclick="delete121Room('${r.id}','${r.name.replace(/'/g,"")}')">🗑 حذف</button>
        </td>`;
      body.appendChild(tr);
    });
  }catch(e){console.error(e);}
}
async function delete121Room(roomId,roomName){
  if(!await showConfirm('حذف المحادثة الخاصة "'+roomName+'" نهائياً؟ لا يمكن التراجع.','🗑 حذف محادثة خاصة'))return;
  try{await api('/rooms/'+roomId,'DELETE');toast('تم حذف المحادثة الخاصة ✓','success');loadOneOnOnePanel();state.socket?.emit('basil_get_all_rooms');state.socket?.emit('owner_get_all_rooms');}
  catch(e){toast('فشل الحذف: '+e.message,'error');}
}
function renderManageLogs(){
  const lb=$('logsBody');if(lb){lb.innerHTML='';state.roomLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.nickname}</b></td><td dir="ltr" style="font-size:9px">${l.ip||'-'}</td><td>${l.country||'-'}</td><td>${l.joinedAt?new Date(l.joinedAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt?new Date(l.leftAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt&&l.joinedAt?Math.round((new Date(l.leftAt)-new Date(l.joinedAt))/60000)+'د':'متصل'}</td><td><button class="rm-btn rm-btn-red" style="font-size:9px;padding:2px 6px" onclick="openBanLogDialog({nickname:'${l.nickname}',ip:'${l.ip||''}',fingerprint:'${l.fp||''}'})">حظر</button></td>`;lb.appendChild(tr);});}
  const ab=$('adminLogsBody');if(ab){ab.innerHTML='';state.adminLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.by}</b></td><td>${l.action}</td><td>${l.target}</td><td>${l.date}</td>`;ab.appendChild(tr);});}
}
function saveVoiceSettings(){
  state.roomSettings.freeMic=$('vs-freemic')?.checked??true;
  state.roomSettings.requireHand=$('vs-requirehand')?.checked??false;
  state.roomSettings.maxMicTime=parseInt($('vs-maxtime')?.value)||0;
  state.roomSettings.maxSpeakers=parseInt($('vs-maxspeakers')?.value)||1;
  state.roomSettings.guestMicAllowed=$('vs-guestmic')?.checked===true;
  const rankTimes={
    guest:   parseInt($('vst-guest')?.value)||0,
    user:    parseInt($('vst-user')?.value)||0,
    moderator:parseInt($('vst-moderator')?.value)||0,
    super_admin:parseInt($('vst-super_admin')?.value)||0,
    master:  parseInt($('vst-master')?.value)||0,
    pink_master: parseInt($('vst-master')?.value)||0, 
    owner:   0
  };
  state.roomSettings.rankTimes=rankTimes;
  if(state.currentRoom){
    state.socket?.emit('save_voice_settings',{roomId:state.currentRoom.id,settings:{
      maxSpeakers:state.roomSettings.maxSpeakers,
      maxMicTime:state.roomSettings.maxMicTime,
      freeMic:state.roomSettings.freeMic,
      requireHand:state.roomSettings.requireHand,
      guestMicAllowed:state.roomSettings.guestMicAllowed,
      rankTimes
    }});
    state.socket?.emit('save_rank_times',{roomId:state.currentRoom.id,rankTimes});
  } else {
    toast('اختر غرفة أولاً لحفظ إعدادات الصوت','error');return;
  }
  toast('تم حفظ إعدادات الصوت ✓','success');
}
function populateVoiceSettingsForm(){
  const rs=state.roomSettings;
  if($('vs-freemic')) $('vs-freemic').checked=rs.freeMic!==false;
  if($('vs-requirehand')) $('vs-requirehand').checked=rs.requireHand===true;
  if($('vs-maxtime')) $('vs-maxtime').value=rs.maxMicTime||0;
  if($('vs-maxspeakers')) $('vs-maxspeakers').value=rs.maxSpeakers||1;
  if($('vs-guestmic')) $('vs-guestmic').checked=rs.guestMicAllowed===true;
  const rankTimes=rs.rankTimes||{};
  ['guest','user','moderator','super_admin','master'].forEach(r=>{
    if($('vst-'+r)) $('vst-'+r).value=rankTimes[r]||0;
  });
}
function saveWebcamSettings(){
  const whoCan=document.querySelector('input[name="wc-whoCan"]:checked')?.value||'all';
  state.roomSettings.whoCan=whoCan;
  state.roomSettings.camAllow=whoCan!=='disabled';
  state.roomSettings.camRequireApproval=$('wc-requireapproval').checked;
  state.roomSettings.maxCams=parseInt($('wc-maxcams').value)||5;
  if(state.currentRoom){
    state.socket?.emit('save_voice_settings',{roomId:state.currentRoom.id,settings:{
      camAllow:state.roomSettings.camAllow,
      camRequireApproval:state.roomSettings.camRequireApproval,
      whoCan:state.roomSettings.whoCan,
      maxCams:state.roomSettings.maxCams
    }});
  }
  toast('تم حفظ إعدادات الكاميرا ✓','success');
}
function populateWebcamSettingsForm(){
  const whoCan=state.roomSettings.whoCan||'all';
  const radio=document.querySelector(`input[name="wc-whoCan"][value="${whoCan}"]`);
  if(radio) radio.checked=true;
  if($('wc-requireapproval')) $('wc-requireapproval').checked=state.roomSettings.camRequireApproval!==false;
  if($('wc-maxcams')) $('wc-maxcams').value=state.roomSettings.maxCams||5;
}
function saveDesignSettings(){if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}const design={bgColor:$('d-bgColor')?.value||'',chatBg:$('d-chatBg')?.value||'',panelBg:$('d-panelBg')?.value||'',toolbarBg:$('d-toolbarBg')?.value||'',welcomeMsg:$('d-welcomeMsg')?.value||''};state.socket?.emit('save_room_design',{roomId:state.currentRoom.id,design});toast('تم تطبيق التصميم على الجميع ✓','success');}
function saveAdvancedSettings(){
  state.roomSettings.noAvatars=$('adv-noAvatars').checked;
  state.roomSettings.noURLs=$('adv-noURLs').checked;
  state.roomSettings.guestPmAllowed=$('adv-guestPm').checked;
  if(state.currentRoom)state.socket?.emit('save_voice_settings',{roomId:state.currentRoom.id,settings:{
    guestPmAllowed:state.roomSettings.guestPmAllowed,
    noAvatars:state.roomSettings.noAvatars,
    noURLs:state.roomSettings.noURLs
  }});
  renderUsers();toast('تم حفظ الإعدادات ✓','success');
}
function populateAdvancedSettingsForm(){
  if($('adv-noAvatars')) $('adv-noAvatars').checked=state.roomSettings.noAvatars===true;
  if($('adv-noURLs')) $('adv-noURLs').checked=state.roomSettings.noURLs===true;
  if($('adv-guestPm')) $('adv-guestPm').checked=state.roomSettings.guestPmAllowed===true;
  if($('multiLoginToggle')) $('multiLoginToggle').checked=state.globalSettings?.allowMultiLogin!==false;
  if($('siteClosedToggle')) $('siteClosedToggle').checked=state.globalSettings?.siteClosed===true;
  if($('siteClosedMsg') && state.globalSettings?.siteClosedMessage) $('siteClosedMsg').value=state.globalSettings.siteClosedMessage;
  const allowed=state.globalSettings?.siteClosedAllowedUserIds||[];
  document.querySelectorAll('#siteCloseAllowedList input[type="checkbox"]').forEach(cb=>{cb.checked=allowed.includes(cb.value);});
}
function saveSoundSettings(){state.soundsEnabled=!$('soundDisable').checked;state.socket?.emit('set_sound_prefs',{disabled:!state.soundsEnabled});toast(state.soundsEnabled?'الأصوات مفعّلة 🔊':'الأصوات معطّلة 🔇','info');}

function toggleSiteClosed(){
  if(!isOwner())return;
  const closed=$('siteClosedToggle')?.checked||false;
  const msg=($('siteClosedMsg')?.value||'').trim()||'الموقع مغلق مؤقتاً للصيانة';
  const allowedUserIds=Array.from(document.querySelectorAll('#siteCloseAllowedList input[type="checkbox"]:checked')).map(cb=>cb.value);
  state.socket?.emit('set_site_closed',{closed,message:msg,allowedUserIds});
  toast(closed?'🔒 تم إغلاق الموقع — المستخدمون لن يتمكنوا من الدخول':'🔓 تم فتح الموقع','success');
}
async function loadSiteCloseAllowedList(){
  const list=$('siteCloseAllowedList');if(!list||!isOwner())return;
  try{
    const users=await api('/admin/users');
    const admins=users.filter(u=>['moderator','super_admin','master','pink_master'].includes(u.role));
    const allowed=state.globalSettings?.siteClosedAllowedUserIds||[];
    list.innerHTML=admins.length?'':'<span style="color:#888">لا يوجد مشرفون</span>';
    admins.forEach(u=>{
      const row=el('label','chk-row');row.style.cssText='display:flex;gap:6px;padding:3px 0';
      row.innerHTML=`<input type="checkbox" value="${u.id}" ${allowed.includes(u.id)?'checked':''}> <span>${u.nickname} <small style="color:#888">(${ROLE_LBL[u.role]||u.role})</small></span>`;
      list.appendChild(row);
    });
  }catch(e){console.error(e);}
}

async function doAddAccount(){
  const u=$('newAccUser').value.trim().toLowerCase(),p=$('newAccPass').value,r=$('newAccRole').value;
  if(!u||!p){$('addAccountMsg').textContent='البيانات مطلوبة';$('addAccountMsg').className='info-msg error';return;}
  const perms={};PERMS_LIST.forEach(pr=>{perms[pr.key]=$('nacp_'+pr.key)?.checked===true;});
  $('addAccountMsg').textContent='جاري الإنشاء...';
  try{
    await api('/auth/register','POST',{username:u,nickname:u,password:p,avatar:'🌙',fingerprint:''});
    const users=await api('/admin/users');const newUser=users.find(x=>x.username===u);
    if(newUser){
      if(r!=='user')await api('/admin/role/'+newUser.id,'PATCH',{role:r});
      if(roleLevel(r)>=2) await api('/admin/permissions/'+newUser.id,'PATCH',{permissions:perms});
    }
    $('addAccountModal').style.display='none';$('addAccountMsg').textContent='';toast('تم إنشاء الحساب ✓','success');loadAccountsPanel();
  }catch(e){$('addAccountMsg').textContent=e.message;$('addAccountMsg').className='info-msg error';}
}

function openSpyPanel(){if(!isOwner()){toast('لوحة التجسس للمالك فقط','error');return;}$('spyPanel').style.display='flex';bringToFront($('spyPanel'));state.socket?.emit('basil_get_all_rooms');state.socket?.emit('owner_get_all_rooms');state.socket?.emit('spy_pms');state.socket?.emit('basil_get_logs');state.socket?.emit('owner_get_logs');state.socket?.emit('basil_get_online_all');state.socket?.emit('owner_get_online_all');}

// ★ FIX: Completely revamped to render room boxes
function renderSpyRooms(){
  const container=$('spyRoomList');if(!container)return;container.innerHTML='';
  if(!state.spyRooms.length){container.innerHTML='<div style="color:#668866;padding:10px">لا توجد غرف</div>';return;}
  
  container.style.display='flex';
  container.style.flexWrap='wrap';
  container.style.gap='8px';
  container.style.listStyle='none';
  container.style.padding='0';
  
  state.spyRooms.forEach(r=>{
    const box=el('li','spy-room-box');
    box.style.cssText='flex:1 1 30%;min-width:120px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;cursor:pointer;text-align:center;transition:0.2s;position:relative;';
    box.innerHTML=`<div style="font-size:20px;margin-bottom:5px;">${r.icon}</div><div style="font-size:12px;color:#fff;font-weight:700;">${r.name}</div>${r.is_private?'<span style="color:#f59e0b;font-size:10px;">🔐 خاصة</span>':''}`;
    
    box.addEventListener('mouseenter',()=>box.style.background='rgba(255,255,255,0.1)');
    box.addEventListener('mouseleave',()=>box.style.background='rgba(255,255,255,0.05)');
    
    box.addEventListener('click',()=>{
      if($('spyCurrentRoom'))$('spyCurrentRoom').textContent=r.name;
      state.socket?.emit('spy_room',{roomId:r.id});
    });
    
    const joinBtn=el('button','rm-btn','👁');
    joinBtn.style.cssText='position:absolute;top:2px;left:2px;font-size:9px;padding:2px 4px;background:rgba(0,0,0,0.5);';
    joinBtn.title='دخول متخفي';
    joinBtn.addEventListener('click',(e)=>{
      e.stopPropagation();
      joinRoom({id:r.id,name:r.name,icon:r.icon||'💬'},true);
      $('spyPanel').style.display='none';
      toast('👁 دخلت "'+r.name+'" متخفياً','info');
    });
    box.appendChild(joinBtn);
    
    container.appendChild(box);
  });
}
function renderSpyHistory(roomId){
  const msgs=state.spyMessages[roomId]||[];
  const area=$('spyMessages');
  if(!area)return;
  area.innerHTML='';
  if(!msgs.length){area.innerHTML='<div style="color:#668866;padding:10px">لا توجد رسائل</div>';return;}
  msgs.forEach(m=>{
    const d=el('div','spy-msg-line');
    d.innerHTML=`<span class="spy-ts">[${fmtTime(m.created_at||m.createdAt)}]</span> <b style="color:#cc88ff">${m.nickname||m.username||'?'}:</b> <span style="color:#ccaaee">${m.type==='image'?'[صورة]':(m.content||'')}</span>`;
    area.appendChild(d);
  });
  area.scrollTop=area.scrollHeight;
}

// ★ FIX: Completely revamped to group PMs into conversation boxes and add Clear All
function renderSpyPms(){
  const list=$('spyPmList');if(!list)return;list.innerHTML='';
  
  const clearBtn=el('button','rm-btn rm-btn-red','🗑 مسح القائمة');
  clearBtn.style.cssText='margin-bottom:10px;width:100%;font-size:11px;padding:5px;';
  clearBtn.addEventListener('click',()=>{
    state.spyPms=[];
    renderSpyPms();
    toast('تم مسح قائمة الرسائل الخاصة من العرض','info');
  });
  list.appendChild(clearBtn);

  if(!state.spyPms.length){
    list.appendChild(el('div','spy-empty','لا توجد رسائل خاصة'));
    return;
  }
  
  const convos={};
  state.spyPms.forEach(m=>{
    const from=m.from_username||m.from_nickname||'مجهول';
    const to=m.to_username||'مجهول';
    const key=[from,to].sort().join(' ↔ ');
    if(!convos[key])convos[key]={users:key,msgs:[]};
    convos[key].msgs.push(m);
  });
  
  Object.values(convos).forEach(c=>{
    const lastMsg=c.msgs[c.msgs.length-1];
    const box=el('div','spy-convo-box');
    box.style.cssText='background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;margin-bottom:8px;cursor:pointer;';
    box.innerHTML=`
      <div style="color:#ff88cc;font-weight:700;font-size:13px;margin-bottom:4px;">💬 ${c.users}</div>
      <div style="color:#aaa;font-size:11px;">${lastMsg.from_username}: ${lastMsg.content.slice(0,50)}</div>
    `;
    box.addEventListener('click',()=>showSpyConvo(c));
    list.appendChild(box);
  });
}

function showSpyConvo(convo){
  const list=$('spyPmList');if(!list)return;list.innerHTML='';
  
  const backBtn=el('button','rm-btn','‹ رجوع');
  backBtn.style.cssText='margin-bottom:10px;font-size:11px;padding:5px 10px;';
  backBtn.addEventListener('click',renderSpyPms);
  list.appendChild(backBtn);
  
  const header=el('div','',`💬 ${convo.users}`);
  header.style.cssText='color:#ff88cc;font-weight:700;font-size:14px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;';
  list.appendChild(header);
  
  convo.msgs.forEach(m=>{
    const d=el('div','spy-msg-line');
    d.style.cssText='padding:8px;border-radius:6px;margin-bottom:4px;background:rgba(0,0,0,0.2);';
    d.innerHTML=`<span style="color:#888;font-size:10px;">[${fmtTime(m.created_at)}]</span> <b style="color:#cc88ff">${m.from_username}</b> <span style="color:#eee;">${m.content}</span>`;
    list.appendChild(d);
  });
}

function appendSpyLog(text,time){const area=$('spyLiveLog');if(!area)return;const d=el('div','spy-msg-line');d.innerHTML=`<span class="spy-ts">[${fmtTime(time)}]</span> <span style="color:#88ffaa">${text}</span>`;area.appendChild(d);area.scrollTop=area.scrollHeight;}
function renderSpyLogs(){const lb=$('spyLogsBody');if(!lb)return;lb.innerHTML='';state.roomLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.nickname}</b></td><td dir="ltr" style="font-size:9px">${l.ip||'-'}</td><td>${l.country||'-'}</td><td>${l.joinedAt?new Date(l.joinedAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt?new Date(l.leftAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt&&l.joinedAt?Math.round((new Date(l.leftAt)-new Date(l.joinedAt))/60000)+'د':'متصل'}</td><td><button class="rm-btn rm-btn-red" style="font-size:9px;padding:2px 6px" onclick="openBanLogDialog({nickname:'${l.nickname}',ip:'${l.ip||''}',fingerprint:'${l.fp||''}'})">حظر</button></td>`;lb.appendChild(tr);});const ab=$('spyAdminLogsBody');if(!ab)return;ab.innerHTML='';state.adminLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.by}</b></td><td>${l.action}</td><td>${l.target}</td><td>${l.date}</td>`;ab.appendChild(tr);});}
function renderAllOnline(users){[$('allOnlineBody'),$('allOnlineBodySpy')].forEach(body=>{if(!body)return;body.innerHTML='';users.forEach(u=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${u.avatar||'🌙'} <b style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</b></td><td style="color:${ROLE_COLORS[u.role]||'#000'}">${ROLE_LBL[u.role]||u.role}</td><td>${u.roomId?state.rooms.find(r=>r.id===u.roomId)?.name||'-':'-'}</td><td dir="ltr" style="font-size:9px">${u.ip||'-'}</td><td>${u.country||'-'}</td><td dir="ltr" style="font-size:9px">${(u.fingerprint||'').slice(0,14)}...</td><td><button class="rm-btn rm-btn-red" style="font-size:9px;padding:2px 6px" onclick="openBanLogDialog({nickname:'${u.nickname}',ip:'${u.ip||''}',fingerprint:'${u.fingerprint||''}'})">حظر</button></td>`;body.appendChild(tr);});});}
function openRoomLockDialog(roomId){state._lockingRoomId=roomId;$('roomPassInput').value='';$('roomPassModal').style.display='flex';bringToFront($('roomPassModal'));}

function toggleUndercover(){if(!isOwner())return;state.undercover=!state.undercover;const btn=$('undercoverBtn');if(btn){btn.textContent='👁 التخفي: '+(state.undercover?'مفعّل':'معطّل');btn.style.background=state.undercover?'linear-gradient(to bottom,#800080,#600060)':'';}let ind=document.querySelector('.undercover-bar');if(state.undercover){if(!ind){ind=el('div','undercover-bar','👁 وضع التخفي مفعّل');document.body.appendChild(ind);}}else{ind?.remove();}toast(state.undercover?'👁 وضع التخفي مفعّل':'👁 وضع التخفي معطّل','info');if(state.currentRoom&&state.socket){state.socket.disconnect();setTimeout(()=>{state.socket=null;connectSocket();setTimeout(()=>joinRoom(state.currentRoom,state.undercover,''),1500);},500);}}
function initSpyNav(){document.querySelectorAll('.spy-nav-item').forEach(item=>{item.addEventListener('click',()=>{document.querySelectorAll('.spy-nav-item').forEach(i=>i.classList.remove('active'));document.querySelectorAll('.spy-panel').forEach(p=>p.classList.remove('active'));item.classList.add('active');const p=$('spp-'+item.dataset.sp);if(p)p.classList.add('active');if(item.dataset.sp==='online'){state.socket?.emit('basil_get_online_all');state.socket?.emit('owner_get_online_all');}if(item.dataset.sp==='pms')state.socket?.emit('spy_pms');if(item.dataset.sp==='logs'){state.socket?.emit('basil_get_logs');state.socket?.emit('owner_get_logs');}if(item.dataset.sp==='rooms'){state.socket?.emit('basil_get_all_rooms');state.socket?.emit('owner_get_all_rooms');}});});}

let _micTimerInterval = null;
let _micTimerBar = null;

function _updateTimerUI(remaining){
  const btn=$('talkBtn');
  if(!btn)return;
  const m=Math.floor(remaining/60),s=remaining%60;
  const label=(m>0?m+'د ':'')+String(s).padStart(2,'0')+'ث';
  btn.querySelector('span:last-child').textContent=label;
  if(remaining<=10){
    btn.style.background='linear-gradient(to bottom,#cc0000,#880000)';
    btn.classList.add('timing-urgent');
  } else if(remaining<=30){
    btn.style.background='linear-gradient(to bottom,#cc6600,#994400)';
    btn.classList.remove('timing-urgent');
  } else {
    btn.style.background='linear-gradient(to bottom,#2a7a2a,#1a5a1a)';
    btn.classList.remove('timing-urgent');
  }
  showMicTimerOnStage(remaining);
}

function showMicTimerOnStage(remaining){
  let bar=$('micTimerBar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='micTimerBar';
    bar.className='mic-timer-bar';
    const section=document.querySelector('.stage-section');
    const slots=$('stageSlots');
    if(section&&slots){
      slots.insertAdjacentElement('afterend',bar);
    } else if(section){
      section.appendChild(bar);
    } else {
      document.querySelector('.users-panel')?.appendChild(bar);
    }
  }
  const m=Math.floor(remaining/60),s=remaining%60;
  const pct=state._micMaxTime>0?Math.max(0,Math.round(remaining/state._micMaxTime*100)):100;
  const cls=remaining<=10?'urgent':remaining<=30?'warn':'';
  bar.innerHTML=`<div class="mic-timer-fill ${cls}" style="width:${pct}%"></div>`
    +`<span class="mic-timer-label">⏱ ${(m>0?m+'د ':'')+(s<10?'0':'')+s}ث</span>`;
  bar.style.display='block';
  if(remaining<=0){setTimeout(()=>{if(bar)bar.style.display='none';},600);}
}

function showMicTimer(maxSeconds){
  clearInterval(_micTimerInterval);
  state._micMaxTime=maxSeconds;
  let remaining=maxSeconds;
  _updateTimerUI(remaining);
  _micTimerInterval=setInterval(()=>{
    remaining--;
    _updateTimerUI(remaining);
    if(remaining<=0){
      clearInterval(_micTimerInterval);
      const btn=$('talkBtn');
      if(btn){btn.querySelector('span:last-child').textContent='ميكروفون';btn.style.background='';btn.classList.remove('timing-urgent');}
      $('micTimerBar')&&($('micTimerBar').style.display='none');
    }
  },1000);
}

window.addEventListener('mic_timer',e=>{
  const {remaining,max}=e.detail;
  if(!state._micMaxTime)state._micMaxTime=max;
  _updateTimerUI(remaining);
});
window.addEventListener('mic_time_up',()=>{
  clearInterval(_micTimerInterval);
  const btn=$('talkBtn');
  if(btn){btn.querySelector('span:last-child').textContent='ميكروفون';btn.style.background='';btn.classList.remove('timing-urgent');}
  $('micTimerBar')&&($('micTimerBar').style.display='none');
  state.micActive=false;$('talkBtn').classList.remove('active');
  toast('⏰ انتهى وقت الميكروفون','info');
});

window._applyAdminMicTime = function(timeLeft){
  clearInterval(_micTimerInterval);
  state._micMaxTime = timeLeft;
  Voice.setMaxTime(state.socket, timeLeft); 
  if(timeLeft===0){
    $('micTimerBar')&&($('micTimerBar').style.display='none');
    toast('⏱ تم رفع حد الوقت','success');
  } else {
    showMicTimer(timeLeft);
    toast('⏱ تم تعديل وقتك إلى '+timeLeft+' ثانية','info');
  }
};

function saveGlobalSettings(){
  const multiLogin=$('multiLoginToggle')?.checked ?? true;
  state.socket?.emit('set_global_settings',{allowMultiLogin:multiLogin});
  toast('تم حفظ الإعدادات العامة ✓','success');
}

function doLogout(){
  Voice.cleanup();
  state.localStream?.getTracks().forEach(t=>t.stop());
  state.socket?.disconnect();state.socket=null;
  api('/auth/logout','POST').catch(()=>{});
  localStorage.removeItem('sahar_token');localStorage.removeItem('sahar_user');
  state.token=null;state.user=null;state.currentRoom=null;
  $('pmPanel')&&($('pmPanel').style.display='none');state.pmTarget=null;
  $('camModal')&&($('camModal').style.display='none');
  $('ctxMenu')&&($('ctxMenu').style.display='none');
  $('spyPanel')&&($('spyPanel').style.display='none');
  document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none');
  document.querySelector('.users-panel')?.classList.remove('open');
  document.querySelector('.rooms-panel')?.classList.remove('open');
  $('panelBackdrop')?.classList.remove('show');
  $('chatScreen').classList.remove('active');$('loginScreen').classList.add('active');
}
function toast(msg,type='info'){const t=el('div','toast '+type,msg);$('toastContainer').appendChild(t);setTimeout(()=>t.remove(),3500);}

function showFullScreenMsg(title,msg,color='#880000'){
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.85);color:#fff;font-family:Cairo,sans-serif;text-align:center;gap:16px;padding:20px;cursor:pointer';
  d.innerHTML='<div style="font-size:52px">'+title.split(' ')[0]+'</div>'
    +'<div style="font-size:22px;font-weight:900;color:'+color+'">'+title+'</div>'
    +'<div style="font-size:15px;background:rgba(255,255,255,.1);padding:16px 32px;border-radius:8px;max-width:480px;line-height:2">'+msg+'</div>'
    +'<div style="font-size:12px;opacity:.6">اضغط في أي مكان للمتابعة</div>';
  d.addEventListener('click',()=>d.remove());
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),6000);
}

function showMobileTab(name){
  document.querySelectorAll('.mtab-btn').forEach(b=>b.classList.toggle('active',b.dataset.mtab===name));
  document.querySelector('.rooms-panel')?.classList.toggle('mobile-tab-active', name==='rooms');
  document.querySelector('.chat-panel')?.classList.toggle('mobile-tab-active', name==='chat');
  document.querySelector('.users-panel')?.classList.toggle('mobile-tab-active', name==='users');
  document.querySelector('.rooms-panel')?.classList.remove('open');
  document.querySelector('.users-panel')?.classList.remove('open');
  $('panelBackdrop')?.classList.remove('show');
}
function toggleUsersPanel(){
  const isActive=document.querySelector('.users-panel')?.classList.contains('mobile-tab-active');
  showMobileTab(isActive?'chat':'users');
}
function toggleRoomsPanel(){
  const isActive=document.querySelector('.rooms-panel')?.classList.contains('mobile-tab-active');
  showMobileTab(isActive?'chat':'rooms');
}
function closeMobilePanels(){if(window.innerWidth<=768){document.querySelector('.users-panel')?.classList.remove('open');document.querySelector('.rooms-panel')?.classList.remove('open');$('panelBackdrop')?.classList.remove('show');}}

function bindChat(){
  $('sendBtn').addEventListener('click',sendMsg);
  $('msgInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});
  $('msgInput').addEventListener('input',()=>{autoResize($('msgInput'));startTyping();});
  $('emojiBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('emojiPicker');p.style.display=p.style.display==='none'?'flex':'none';if(p.style.display==='flex')bringToFront(p);});
  document.addEventListener('click',()=>{$('emojiPicker').style.display='none';$('colorPanel').style.display='none';const fm=$('fmtMorePanel');if(fm)fm.style.display='none';const sw=$('statusPickerWrap');if(sw)sw.style.display='none';});
  $('colorBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('colorPanel');p.style.display=p.style.display==='none'?'block':'none';if(p.style.display==='block')bringToFront(p);});
  $('applyCustomColor').addEventListener('click',()=>{applyColor($('customColorInput').value);$('colorPanel').style.display='none';});
  document.querySelectorAll('.fsize').forEach(btn=>btn.addEventListener('click',()=>{state.fontSize=parseInt(btn.dataset.size);$('msgInput').style.fontSize=state.fontSize+'px';document.querySelectorAll('.fsize').forEach(b=>b.classList.toggle('active',b.dataset.size===btn.dataset.size));}));
  const toggleBold=()=>{state.bold=!state.bold;document.querySelectorAll('#boldBtn,#boldBtn2').forEach(b=>b?.classList.toggle('active',state.bold));$('msgInput').style.fontWeight=state.bold?'700':'400';};
  const toggleItalic=()=>{state.italic=!state.italic;document.querySelectorAll('#italicBtn,#italicBtn2').forEach(b=>b?.classList.toggle('active',state.italic));$('msgInput').style.fontStyle=state.italic?'italic':'normal';};
  $('boldBtn').addEventListener('click',toggleBold);
  $('boldBtn2')?.addEventListener('click',toggleBold);
  $('italicBtn').addEventListener('click',toggleItalic);
  $('italicBtn2')?.addEventListener('click',toggleItalic);
  $('imageBtn')?.addEventListener('click',()=>$('imageInput').click());
  $('imageInput')?.addEventListener('change',e=>{if(e.target.files[0])sendImage(e.target.files[0]);e.target.value='';});
  $('talkBtn').addEventListener('click',toggleTalk);
  $('muteBtn').addEventListener('click',toggleMuteBtn);
  $('camBtn').addEventListener('click',toggleCam);
  $('camSettingsBtn').addEventListener('click',openDeviceSettings);
  $('handBtn').addEventListener('click',()=>{if(state.handRaised){state.socket?.emit('lower_hand');state.handRaised=false;$('handBtn').classList.remove('active');toast('✋ تم إنزال يدك','info');}else{state.socket?.emit('raise_hand');state.handRaised=true;$('handBtn').classList.add('active');toast('✋ تم رفع يدك','info');}});
  $('clearChatBtn')?.addEventListener('click',async ()=>{if(await showConfirm('مسح جميع رسائل الغرفة؟','🗑 مسح الدردشة'))state.socket?.emit('clear_chat',{roomId:state.currentRoom?.id});});
  $('addRoomBtn')?.addEventListener('click',openAddRoom);
  $('roomManageBtn')?.addEventListener('click',openRoomManage);
  $('rulesBtn').addEventListener('click',openRules);
  $('leaveRoomBtn').addEventListener('click',()=>{
    Voice.cleanupAudio();
    if(state.micActive){Voice.stopSpeaking(state.socket);state.micActive=false;$('talkBtn').classList.remove('active');}
    state.currentRoom=null;$('messagesArea').innerHTML='';$('menuRoomName').textContent='سهر الليالي';$('roomTabName').textContent='اختر غرفة';document.querySelectorAll('.room-item').forEach(i=>i.classList.remove('active'));
    state.socket?.emit('leave_room_explicit');
  });
  $('profileItem').addEventListener('click',openProfile);
  $('logoutItem').addEventListener('click',doLogout);
  $('notifBell').addEventListener('click',()=>{state.notifications=0;$('notifCount').style.display='none';});
  $('myStatusIcon')?.addEventListener('click',e=>{e.stopPropagation();const w=$('statusPickerWrap');w.style.display=w.style.display==='none'||!w.style.display?'flex':'none';if(w.style.display==='flex')bringToFront(w);});
  $('pmRejectAllBtn')?.addEventListener('click',()=>{state.rejectAllPm=!state.rejectAllPm;state.socket?.emit('set_reject_all_pm',{reject:state.rejectAllPm});toast(state.rejectAllPm?'تم رفض كل الرسائل الخاصة':'تم السماح بالرسائل الخاصة','info');$('pmRejectAllBtn').textContent=state.rejectAllPm?'✓ رفض الكل':'رفض الرسائل الخاصة';});
  $('pmEmojiBtn')?.addEventListener('click',e=>{e.stopPropagation();const p=$('pmEmojiPicker');p.style.display=p.style.display==='none'?'flex':'none';if(p.style.display==='flex')bringToFront(p);});
  $('closeProfile').addEventListener('click',()=>$('profileModal').style.display='none');
  $('saveProfileBtn').addEventListener('click',saveProfile);
  $('changePassBtn').addEventListener('click',changePass);
  $('profColorInput').addEventListener('input',e=>$('profColorPreview').textContent=e.target.value);
  $('closeRules').addEventListener('click',()=>$('rulesModal').style.display='none');
  $('editRulesBtn')?.addEventListener('click',()=>{$('rulesEdit').style.display='';$('saveRulesBtn').style.display='';$('editRulesBtn').style.display='none';});
  $('saveRulesBtn').addEventListener('click',saveRules);
  $('closeRoomModal').addEventListener('click',()=>$('roomModal').style.display='none');
  $('saveRoomBtn').addEventListener('click',saveRoom);
  $('deleteRoomBtn').addEventListener('click',deleteRoom);
  $('closeUserInfo').addEventListener('click',()=>$('userInfoModal').style.display='none');
  $('closePm').addEventListener('click',()=>{$('pmPanel').style.display='none';state.pmTarget=null;});
  $('pmSendBtn').addEventListener('click',sendPm);
  $('pmInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendPm();}});
  $('closeCamModal').addEventListener('click',()=>$('camModal').style.display='none');
  $('cancelReply').addEventListener('click',cancelReply);
  $('closeRoomManage').addEventListener('click',()=>$('roomManagePanel').style.display='none');
  document.querySelectorAll('.rm-nav-item').forEach(item=>item.addEventListener('click',()=>switchRmPanel(item.dataset.panel)));
  $('accountSearch')?.addEventListener('input',loadAccountsPanel);
  $('saveVoiceBtn')?.addEventListener('click',saveVoiceSettings);
  $('saveWebcamBtn')?.addEventListener('click',saveWebcamSettings);
  $('saveDesignBtn')?.addEventListener('click',saveDesignSettings);
  $('saveAdvancedBtn')?.addEventListener('click',saveAdvancedSettings);
  $('saveSoundBtn')?.addEventListener('click',saveSoundSettings);
  $('clearAllBansBtn')?.addEventListener('click',async ()=>{if(await showConfirm('مسح جميع الحظر والكتم؟','🗑 مسح الحظر')){state.socket?.emit('clear_all_bans');setTimeout(loadBannedPanel,400);}});
  $('multiLoginToggle')?.addEventListener('change',e=>state.socket?.emit('set_global_settings',{allowMultiLogin:e.target.checked}));
  $('saveGlobalBtn')?.addEventListener('click',saveGlobalSettings);
  $('siteCloseBtn')?.addEventListener('click',toggleSiteClosed);
  $('debugGeoBtn')?.addEventListener('click',async ()=>{
    const btn=$('debugGeoBtn'),out=$('debugGeoResult');
    btn.disabled=true;btn.textContent='جاري الاختبار...';
    out.style.display='block';out.textContent='...';
    try{
      const r=await api('/admin/debug-geo');
      let txt='IP المُختبَر: '+r.ip+'\n'+'='.repeat(40)+'\n\n';
      r.results.forEach(svc=>{
        txt+='📡 '+svc.service+'\n';
        if(svc.error){txt+='  ❌ خطأ شبكة: '+svc.error+'\n';}
        else{
          txt+='  HTTP Status: '+svc.httpStatus+'\n';
          txt+='  الدولة المستخرجة: '+(svc.country||'(لا شيء)')+'\n';
          if(svc.parseError)txt+='  ⚠️ '+svc.parseError+'\n';
          txt+='  الرد الخام: '+svc.rawBody+'\n';
        }
        txt+='\n';
      });
      out.textContent=txt;
    }catch(e){out.textContent='فشل الاختبار: '+e.message;}
    finally{btn.disabled=false;btn.textContent='اختبار خدمة تحديد الدولة الآن';}
  });
  $('addRoomManageBtn')?.addEventListener('click',()=>{$('roomManagePanel').style.display='none';openAddRoom();});
  $('addAccountBtn')?.addEventListener('click',()=>{$('addAccountModal').style.display='flex';bringToFront($('addAccountModal'));});
  $('closeAddAccount')?.addEventListener('click',()=>$('addAccountModal').style.display='none');
  $('cancelAddAccount')?.addEventListener('click',()=>$('addAccountModal').style.display='none');
  $('doAddAccount')?.addEventListener('click',doAddAccount);
  $('closeMuteModal')?.addEventListener('click',()=>$('muteModal').style.display='none');
  $('doMuteBtn')?.addEventListener('click',doMute);
  $('cancelMuteBtn')?.addEventListener('click',()=>$('muteModal').style.display='none');
  $('closeBanModal')?.addEventListener('click', () => $('banModal').style.display = 'none');
  $('cancelBanBtn')?.addEventListener('click', () => $('banModal').style.display = 'none');
  $('doBanBtn')?.addEventListener('click', doBan);
  
  $('closePermModal')?.addEventListener('click',()=>$('permModal').style.display='none');
  $('closePermModal2')?.addEventListener('click',()=>$('permModal').style.display='none');
  $('savePermBtn')?.addEventListener('click',savePermissions);
  $('closeDeviceModal')?.addEventListener('click',()=>{if(micTestStream){micTestStream.getTracks().forEach(t=>t.stop());micTestStream=null;cancelAnimationFrame(micTestAnim);}$('deviceModal').style.display='none';});
  $('testMicBtn')?.addEventListener('click',testMic);
  $('saveDeviceBtn')?.addEventListener('click',saveDeviceSettings);
  $('closeRoomPassEntry')?.addEventListener('click',()=>$('roomPassEntryModal').style.display='none');
  $('roomPassEntryInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('submitRoomPassBtn')?.click();});
  $('closeRoomPass')?.addEventListener('click',()=>$('roomPassModal').style.display='none');
  $('saveRoomPassBtn')?.addEventListener('click',()=>{const pw=$('roomPassInput').value;const roomId=state._lockingRoomId||state.currentRoom?.id;if(roomId){state.socket?.emit('set_room_password',{roomId,password:pw});$('roomPassModal').style.display='none';toast(pw?'تم قفل الغرفة 🔒':'تم رفع القفل','success');}});
  $('lockRoomBtn')?.addEventListener('click',()=>{if(state.currentRoom)openRoomLockDialog(state.currentRoom.id);});
  $('closeSpyPanel')?.addEventListener('click',()=>$('spyPanel').style.display='none');
  $('undercoverBtn')?.addEventListener('click',toggleUndercover);
  $('clearLogsBtn')?.addEventListener('click',async ()=>{if(await showConfirm('مسح جميع السجلات؟','🗑 مسح السجلات'))state.socket?.emit('clear_logs');});
  $('clearLoginAttemptsBtn')?.addEventListener('click',async ()=>{
    if(!await showConfirm('مسح جميع سجلات محاولات الدخول نهائياً؟','🗑 مسح محاولات الدخول'))return;
    try{await api('/admin/login-attempts','DELETE');toast('تم المسح ✓','success');loadLoginAttempts();}
    catch(e){toast('فشل المسح: '+e.message,'error');}
  });
  const backdrop=$('panelBackdrop');
  if(backdrop)backdrop.addEventListener('click',()=>{document.querySelector('.users-panel')?.classList.remove('open');document.querySelector('.rooms-panel')?.classList.remove('open');backdrop.classList.remove('show');});
  document.querySelectorAll('.mtab-btn').forEach(b=>b.addEventListener('click',()=>showMobileTab(b.dataset.mtab)));
  $('tbMoreBtn')?.addEventListener('click',()=>{
    const grid=$('tbMoreGrid');grid.innerHTML='';
    document.querySelectorAll('.toolbar .tb-secondary').forEach(orig=>{
      if(orig.classList.contains('admin-only') && orig.style.display==='none')return;
      const clone=orig.cloneNode(true);clone.removeAttribute('id');clone.style.display='flex';
      clone.addEventListener('click',()=>{orig.click();$('tbMoreOverlay').style.display='none';});
      grid.appendChild(clone);
    });
    $('tbMoreOverlay').style.display='flex';
  });
  $('tbMoreOverlay')?.addEventListener('click',e=>{if(e.target.id==='tbMoreOverlay')e.currentTarget.style.display='none';});
  $('fmtMoreBtn')?.addEventListener('click',e=>{e.stopPropagation();const p=$('fmtMorePanel');p.style.display=p.style.display==='none'?'block':'none';if(p.style.display==='block')bringToFront(p);});
  initSpyNav();
  document.addEventListener('keydown',e=>{if(e.key==='F2'&&isAdmin())openRoomManage();});
}

function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,80)+'px';}
async function api(path,method='GET',body=null){
  const opts={method,headers:{'Content-Type':'application/json'}};
  if(state.token)opts.headers['Authorization']='Bearer '+state.token;
  if(body)opts.body=JSON.stringify(body);
  const res=await fetch(CONFIG.API_URL+'/api'+path,opts);
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||'خطأ في الاتصال');
  return data;
}
