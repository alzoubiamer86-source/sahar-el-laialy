/* سهر الليالي v7.1 — Full Client */
const CONFIG = {
  API_URL:    window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com',
  SOCKET_URL: window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com'
};

const state = {
  token:null, user:null, socket:null,
  rooms:[], currentRoom:null, onlineUsers:[],
  replyTo:null, selectedAvatar:'🌙', selectedRoomIcon:'💬',
  pmTarget:null, typingTimer:null, isTyping:false, editingRoom:null,
  textColor:'#000000', fontSize:14, bold:false, italic:false,
  stageUsers:[], micActive:false, camActive:false, handRaised:false,
  localStream:null, deviceFp:null, undercover:false,
  muteTarget:null, permTarget:null, pendingRoomJoin:null,
  spyRooms:[], spyMessages:{}, spyPms:[],
  adminLogs:[], roomLogs:[],
  deviceSettings:{ micId:'', speakerId:'', camId:'' },
  roomSettings:{ freeMic:true, requireHand:false, maxMicTime:0, maxSpeakers:1, camAllow:true, camRequireApproval:true, whoCan:'all', maxCams:5, welcomeMsg:'مرحباً %NAME% في سهر الليالي', noAvatars:false, noURLs:false },
  myMuteStatus:null, imageAllowed:false, notifications:0,
  soundsEnabled:true, userStatus:'', rejectAllPm:false,
  pmBlockList: new Set(), _lockingRoomId:null
};

const OWNER_USERNAME = 'owner';
const isOwner  = () => state.user?.username?.toLowerCase() === OWNER_USERNAME && state.user?.role === 'owner';
const isAdmin  = () => ['owner','master','super_admin','moderator'].includes(state.user?.role);

const ROLE_LEVELS = { guest:0, user:1, moderator:2, super_admin:3, master:4, owner:5 };
const ROLE_LBL    = { owner:'👑 مالك', master:'🌟 ماستر', super_admin:'⚡ سوبر أدمن', moderator:'🛡️ مشرف', user:'👤 عضو', guest:'🔓 زائر' };
const ROLE_COLORS = { owner:'#8b0000', master:'#8b4513', super_admin:'#6a0dad', moderator:'#00008b', user:'#1a5a1a', guest:'#4a4a6a' };
const RANK_PERMS  = {
  moderator:   ['blockMachine','muteUsers','kickout','clearText','broadcast','unban','viewLog','sendImages'],
  super_admin: ['blockMachine','muteUsers','kickout','sortMicList','clearText','broadcast','unban','viewLog','manageAccounts','manageMembers','manageAdmins','sendImages','dragToRoom','roomSettings','profilePic'],
  master:      ['blockMachine','muteUsers','kickout','sortMicList','clearText','broadcast','unban','viewLog','manageAccounts','manageMembers','manageAdmins','manageSuperAdmins','sendImages','dragToRoom','roomSettings','adminReports','profilePic','machineLock'],
};

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
  {key:'blockMachine',label:'حظر الأجهزة'},{key:'muteUsers',label:'كتم المستخدمين'},{key:'kickout',label:'طرد'},{key:'sortMicList',label:'ترتيب قائمة الميك'},{key:'clearText',label:'مسح النص'},{key:'broadcast',label:'بث رسالة'},{key:'unban',label:'رفع الحظر'},{key:'viewLog',label:'عرض السجل'},{key:'manageAccounts',label:'إدارة الحسابات'},{key:'manageMembers',label:'إدارة الأعضاء'},{key:'manageAdmins',label:'إدارة المشرفين'},{key:'manageSuperAdmins',label:'إدارة السوبر أدمن'},{key:'manageMasters',label:'إدارة الماستر'},{key:'roomSettings',label:'إعدادات الغرفة'},{key:'adminReports',label:'تقارير الإدارة'},{key:'sendImages',label:'إرسال الصور'},{key:'dragToRoom',label:'نقل مستخدمين بين الغرف'},{key:'profilePic',label:'رفع صورة شخصية'},{key:'machineLock',label:'قفل الجهاز'},
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
  const ds=localStorage.getItem('sahar_devices'); if(ds) try{state.deviceSettings=JSON.parse(ds);}catch{}
  const sc=localStorage.getItem('sahar_textcolor'); if(sc) applyColor(sc);
  const tok=localStorage.getItem('sahar_token'); const usr=localStorage.getItem('sahar_user');
  if(tok&&usr){ try{state.token=tok;state.user=JSON.parse(usr);enterChat();}catch{doLogout();} }
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

async function doLogin(){const u=$('loginUser').value.trim().toLowerCase(),p=$('loginPass').value;if(!u||!p){$('loginError').textContent='أدخل البيانات';return;}setLL(true);try{const r=await api('/auth/login','POST',{username:u,password:p,fingerprint:state.deviceFp});save(r.token,r.user);enterChat();}catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}}
async function doRegister(){const u=$('regUser').value.trim().toLowerCase(),p=$('regPass').value;if(!u||!p){$('loginError').textContent='البيانات مطلوبة';return;}setLL(true);try{const r=await api('/auth/register','POST',{username:u,nickname:u,password:p,avatar:state.selectedAvatar,fingerprint:state.deviceFp});save(r.token,r.user);enterChat();}catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}}
async function doGuest(){setLL(true);try{const r=await api('/auth/guest','POST',{fingerprint:state.deviceFp});save(r.token,r.user);enterChat();}catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}}
function setLL(on){[$('loginBtn'),$('registerBtn'),$('guestBtn')].forEach(b=>{if(b)b.disabled=on;});}
function save(t,u){state.token=t;state.user=u;localStorage.setItem('sahar_token',t);localStorage.setItem('sahar_user',JSON.stringify(u));}

async function enterChat(){
  $('loginScreen').classList.remove('active');$('chatScreen').classList.add('active');
  $('myAvatarEl').textContent=state.user.avatar||'🌙';$('myNickEl').textContent=state.user.nickname;
  if(state.user.text_color)applyColor(state.user.text_color);
  const sc=localStorage.getItem('sahar_textcolor');if(sc)applyColor(sc);
  if($('profColorInput'))$('profColorInput').value=state.textColor;
  updateAdminUI();await loadRooms();connectSocket();
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
  if($('roomManageBtn'))$('roomManageBtn').style.display=adm?'flex':'none';
  if($('editRulesBtn'))$('editRulesBtn').style.display=adm?'':'none';
  if($('imageBtn'))$('imageBtn').style.display=(state.imageAllowed||isAdmin())?'flex':'none';
  if($('lockRoomBtn'))$('lockRoomBtn').style.display=isOwner()?'flex':'none';
}

async function loadRooms(){try{state.rooms=await api('/rooms');renderRooms();}catch(e){console.error(e);}}
function renderRooms(){
  const list=$('roomsList');list.innerHTML='';
  const visible=isAdmin()?state.rooms:state.rooms.filter(r=>!r.is_private);
  visible.forEach(room=>{
    const li=el('li','room-item');if(state.currentRoom?.id===room.id)li.classList.add('active');
    li.innerHTML=`<span class="ri-icon">${room.icon}</span><div class="ri-info"><div class="ri-name">${room.name}</div><div class="ri-count" id="rc_${room.id}"></div></div>${room.is_private?'<span class="ri-priv">🔐</span>':''}${room._locked?'<span class="ri-lock">🔒</span>':''}${isAdmin()?`<button class="ri-edit" data-id="${room.id}">✏</button>`:''}`;
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
  $('messagesArea').innerHTML='';cancelReply();
  const welcome=(state.roomSettings.welcomeMsg||'مرحباً %NAME%').replace('%NAME%',state.user.nickname);
  if($('welcomeText'))$('welcomeText').textContent=welcome;if($('welcomeBanner'))$('welcomeBanner').style.display='block';
  // FIX: instant audio cut when changing rooms — NO delay
  Voice.cleanupAudio();          // kills ALL incoming audio immediately
  if(state.micActive){
    Voice.stopSpeaking(state.socket);
    state.micActive=false;
    $('talkBtn').classList.remove('active');
    $('muteBtn').classList.remove('active');
  }
  state.socket?.emit('join_room',{roomId:room.id,undercover:undercover||state.undercover,password});
}

function connectSocket(){
  setConn('connecting');
  state.socket=io(CONFIG.SOCKET_URL,{auth:{token:state.token,fingerprint:state.deviceFp,undercover:state.undercover},transports:['websocket','polling'],reconnection:true,reconnectionAttempts:10,reconnectionDelay:2000});
  const s=state.socket;
  s.on('connect',()=>{setConn('connected');if(!state.currentRoom){const lobby=state.rooms.find(r=>r.name==='الاستقبال')||state.rooms[0];if(lobby)joinRoom(lobby);}else{s.emit('join_room',{roomId:state.currentRoom.id,undercover:state.undercover,password:''});}});
  s.on('disconnect',()=>{setConn('disconnected');state.micActive=false;$('talkBtn').classList.remove('active');});
  s.on('connect_error',()=>setConn('disconnected'));
  s.on('room_locked',({roomId,message})=>{$('roomPassError').textContent='';$('roomPassEntryInput').value='';$('roomPassEntryModal').style.display='flex';$('submitRoomPassBtn').onclick=()=>{const pw=$('roomPassEntryInput').value;if(!pw){$('roomPassError').textContent='أدخل كلمة المرور';return;}$('roomPassEntryModal').style.display='none';joinRoom(state.pendingRoomJoin,state.undercover,pw);};});
  s.on('room_lock_status',({roomId,locked})=>{const room=state.rooms.find(r=>r.id===roomId);if(room)room._locked=locked;if($('roomLockIcon'))$('roomLockIcon').style.display=locked&&state.currentRoom?.id===roomId?'':'none';renderRooms();});
  s.on('room_history',({roomId,messages})=>{if(roomId!==state.currentRoom?.id)return;$('messagesArea').innerHTML='';messages.forEach(m=>renderMsg(m));scrollBot(true);});
  s.on('new_message',msg=>{
    if(msg.roomId===state.currentRoom?.id){renderMsg(msg);scrollBot();return;}
    // fix #10 — owner receives messages from spy-joined rooms
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
  s.on('room_users',({roomId,users})=>{if(roomId!==state.currentRoom?.id)return;state.onlineUsers=users;renderUsers();$('onlineCount').textContent=users.length;$('menuOnlineCount').textContent=users.length+' متصل';});
  s.on('room_design_update',(design)=>{if(design.bgColor)document.body.style.background=design.bgColor;if(design.chatBg)$('messagesArea').style.background=design.chatBg;if(design.panelBg)document.querySelectorAll('.rooms-panel,.users-panel').forEach(p=>p.style.background=design.panelBg);if(design.toolbarBg){document.querySelector('.toolbar').style.background=design.toolbarBg;document.querySelector('.menubar').style.background=design.toolbarBg;}});
  s.on('room_settings_update',(rs)=>Object.assign(state.roomSettings,rs));
  document.querySelectorAll('.modal-overlay,.rm-overlay,.spy-overlay').forEach(m=>{m.addEventListener('mousedown',()=>bringToFront(m));});
  s.on('user_typing',({userId,nickname})=>{if(userId===state.user.id)return;$('typingText').textContent=nickname+' يكتب...';$('typingRow').style.display='flex';});
  s.on('user_stopped_typing',()=>$('typingRow').style.display='none');
  s.on('reaction_added',({messageId,emoji})=>{const line=document.querySelector(`[data-mid="${messageId}"]`);if(!line)return;let row=line.nextElementSibling?.classList?.contains('reactions-row')?line.nextElementSibling:null;if(!row){row=el('div','reactions-row');line.after(row);}let ex=[...row.children].find(c=>c.dataset.e===emoji);if(ex){ex.dataset.c=parseInt(ex.dataset.c||1)+1;ex.textContent=emoji+' '+ex.dataset.c;}else{const r=el('span','react-pill',emoji+' 1');r.dataset.e=emoji;r.dataset.c=1;row.appendChild(r);}});
  s.on('stage_update',({stageUsers})=>{state.stageUsers=stageUsers;renderStage();});
  s.on('hand_queue_update',({queue})=>renderHandQueue(queue));
  s.on('all_hands_lowered',()=>{renderHandQueue([]);toast('تم إنزال جميع الأيدي','info');});
  s.on('hand_lowered_by_admin',({by})=>{
    state.handRaised=false;$('handBtn').classList.remove('active');
    toast('✋ قام '+by+' بإنزال يدك','info');
  });
  s.on('mic_granted',async({by})=>{toast('🎤 منحك '+by+' الميكروفون','success');playSound('mic_on');const ok=await Voice.startSpeaking(s,state.currentRoom?.id,state.deviceSettings.micId||null,state.roomSettings.maxMicTime||0);if(ok){state.micActive=true;$('talkBtn').classList.add('active');$('muteBtn').classList.remove('active');state.handRaised=false;$('handBtn').classList.remove('active');}});
  s.on('mic_revoked',()=>{toast('🎤 تم سحب الميكروفون','info');playSound('mic_off');Voice.stopSpeaking(s);state.micActive=false;$('talkBtn').classList.remove('active');$('muteBtn').classList.remove('active');});
  s.on('speaker_joined',({speakerSocketId,nickname,avatar,sound})=>{Voice.onSpeakerJoined(s,speakerSocketId,nickname,avatar);if(sound)playSound('mic_on');});
  s.on('speaker_left',({speakerSocketId,sound})=>{Voice.onSpeakerLeft(speakerSocketId);if(sound)playSound('mic_off');});
  s.on('new_listener',({listenerSocketId})=>Voice.onNewListener(s,listenerSocketId));
  s.on('webrtc_offer',({from,offer,kind='voice'})=>kind==='cam'?onCamOffer(s,from,offer):Voice.onOffer(s,from,offer));
  s.on('webrtc_answer',({from,answer,kind='voice'})=>kind==='cam'?onCamAnswer(from,answer):Voice.onAnswer(from,answer));
  s.on('webrtc_ice',({from,candidate,kind='voice'})=>kind==='cam'?onCamIce(from,candidate):Voice.onIce(from,candidate));
  s.on('webrtc_close',({socketId})=>{
    // Instant audio kill — no delay
    Voice.onSpeakerLeft(socketId);
    closeCamPeer(socketId);
    console.log('[Voice] webrtc_close received for',socketId?.slice(0,8));
  });
  s.on('cam_available',({socketId,nickname,avatar})=>{if(!isOwner())addCamThumb(socketId,nickname,avatar,true);});
  s.on('cam_gone',({socketId})=>removeCamThumb(socketId));
  s.on('existing_cams',({cams})=>cams.forEach(c=>addCamThumb(c.socketId,c.nickname,c.avatar,!isOwner())));
  s.on('cam_request',({fromNick,fromSocketId,fromAvatar})=>{showCamRequestPopup(fromNick,fromSocketId,fromAvatar);addNotifCount();});
  s.on('cam_rejected_notification',({by})=>toast(by+' رفض طلب الكاميرا','info'));
  s.on('cam_approved_notification',({by})=>toast(by+' وافق على مشاهدة الكاميرا','success'));
  s.on('cam_viewer_approved',({viewerSocketId})=>startCamWebRTCTo(viewerSocketId));
  s.on('cam_viewer_joined',({viewerSocketId,viewerNick,viewerAvatar})=>{toast('👁 '+viewerNick+' يشاهد كاميرتك','info');addCamViewerToList(viewerSocketId,viewerNick);});
  s.on('cam_viewer_left',({viewerSocketId})=>removeCamViewerFromList(viewerSocketId));
  s.on('cam_viewer_kicked',({by,ownerSocketId})=>{
    toast('📷 طردك '+by+' من الكاميرا','error');
    closeCamPeer(ownerSocketId);
    // fix #9 — immediately remove cam view and close modal if open
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
  // fix #5 — owner can also request cam as normal viewer (shows in cam strip)
  s.on('owner_cam_normal_approved',({ownerSocketId})=>startCamWebRTCTo(ownerSocketId));
  s.on('muted_notification',({options,duration,reason,by,expiresAt})=>{state.myMuteStatus={...options,expiresAt};showMuteStatusBar(options,duration,expiresAt,reason,by);});
  s.on('muted_on_login',({options,duration,reason})=>{state.myMuteStatus=options;showMuteStatusBar(options,duration,null,reason,'النظام');});
  s.on('unmuted_notification',({by})=>{state.myMuteStatus=null;$('muteStatusBar').style.display='none';toast('🔊 تم رفع الكتم بواسطة '+by,'success');});
  s.on('permissions_updated',({permissions})=>{state.user.permissions={...state.user.permissions,...permissions};localStorage.setItem('sahar_user',JSON.stringify(state.user));if(permissions.sendImages)state.imageAllowed=true;updateAdminUI();toast('تم تحديث صلاحياتك ✓','success');});
  s.on('role_updated',({role})=>{
    state.user.role=role;
    localStorage.setItem('sahar_user',JSON.stringify(state.user));
    updateAdminUI();
    // fix #1 — prominent notification for rank change
    toast('👑 تم تغيير رتبتك إلى: '+(ROLE_LBL[role]||role),'success');
    // Also show in chat
    renderSys('🎉 تم تغيير رتبتك إلى '+( ROLE_LBL[role]||role));
  });
  s.on('close_pm_panel',()=>{$('pmPanel').style.display='none';state.pmTarget=null;});
  s.on('force_join_room',({roomId,by})=>{const room=state.rooms.find(r=>r.id===roomId);if(room){toast(by+' نقلك إلى غرفة '+room.name,'info');joinRoom(room);}});
  s.on('pm_blocked',({message})=>toast(message,'error'));
  s.on('private_message_received',msg=>{if(state.rejectAllPm||state.pmBlockList.has(msg.from_id)){toast('رسالة خاصة من '+(msg.from_nickname||msg.from_username||'مجهول')+' — مرفوضة','info');return;}showPmNotif(msg);addNotifCount();if(state.pmTarget?.userId===msg.from_id)appendPmMsg(msg,false);});
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
  s.on('kicked',({reason,by})=>{alert('تم طردك من قِبل '+by+'\nالسبب: '+(reason||'غير محدد'));doLogout();});
  s.on('banned',({reason})=>{alert('تم حظرك\nالسبب: '+(reason||'غير محدد'));doLogout();});
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
  if(msg.type==='image'){content=el('span','msg-text');const img=document.createElement('img');img.src=msg.content;img.className='msg-img';img.addEventListener('click',()=>window.open(msg.content,'_blank'));content.appendChild(img);}
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
    const li=el('li','user-item');
    const onStage=state.stageUsers.some(s=>s.userId===u.userId);
    const statusInfo=USER_STATUSES.find(s=>s.key===u.userStatus)||USER_STATUSES[0];
    const adminMuteIcon=u.isAdminMuted?'<span title="مكتوم بواسطة المشرف" style="color:#cc0000">🔇</span>':'';
    const selfMuteIcon=u.isVoiceMuted&&!u.isAdminMuted?'<span title="صوت مكتوم">🔈</span>':'';
    const camIcon=u.camActive?'<span>📷</span>':'';
    const micIcon=onStage?'<span>🎤</span>':'';
    li.innerHTML=`<span class="u-av">${state.roomSettings.noAvatars?'👤':(u.avatar||'🌙')}</span><div class="u-info"><div class="u-nick" style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</div><div class="u-role-lbl">${ROLE_LBL[u.role]||''}</div></div><div class="u-icons">${micIcon}${camIcon}${adminMuteIcon}${selfMuteIcon}</div><span class="u-status-icon" title="${statusInfo.label}">${statusInfo.icon}</span>`;
    if(u.userId!==state.user.id)li.addEventListener('click',e=>{document.querySelectorAll('.user-item').forEach(i=>i.classList.remove('selected'));li.classList.add('selected');showCtx(e,u);});
    list.appendChild(li);
  });
}

function renderStage(){
  const slots=$('stageSlots');slots.innerHTML='';
  if(!state.stageUsers.length){slots.innerHTML='<div class="stage-empty">لا أحد على الميكروفون</div>';return;}
  state.stageUsers.forEach(u=>{
    const d=el('div',`stage-user${u.speaking?' speaking':''}${u.muted?' muted':''}`);
    d.innerHTML=`${u.avatar||'🌙'} ${u.nickname} ${u.muted?'🔇':'🎤'}`;
    if(isAdmin()&&u.userId!==state.user.id){const kb=el('button','stage-kick-btn','✕');kb.title='سحب الميكروفون';kb.addEventListener('click',()=>state.socket?.emit('revoke_mic',{toSocketId:u.socketId}));d.appendChild(kb);}
    slots.appendChild(d);
  });
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
  if(showReqBtn){const rb=el('button','cam-req-btn','👁 مشاهدة');rb.addEventListener('click',e=>{e.stopPropagation();state.socket?.emit('request_cam',{toSocketId:socketId,toNickname:nickname});toast('تم إرسال طلب المشاهدة','info');});th.appendChild(rb);}
  th.addEventListener('click',()=>{$('camVideo').srcObject=v.srcObject;$('camModalTitle').textContent='📷 '+nickname;$('camModal').style.display='flex';bringToFront($('camModal'));});
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
  v.style.cssText='width:220px;height:165px;border-radius:6px;background:#000;border:2px solid #5500aa;object-fit:cover;cursor:pointer';
  const lb=el('div','spy-cam-label',nickname);
  v.addEventListener('click',()=>{$('camVideo').srcObject=v.srcObject;$('camModalTitle').textContent='👁 تجسس: '+nickname;$('camModal').style.display='flex';bringToFront($('camModal'));});
  wrap.appendChild(v);wrap.appendChild(lb);grid.appendChild(wrap);
  state.socket?.emit('request_cam',{toSocketId:socketId,toNickname:nickname});
}

const CAM_ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},{urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'}]};

async function startCamWebRTCTo(toSocketId){if(!state.localStream)return;closeCamPeer(toSocketId);const pc=new RTCPeerConnection(CAM_ICE);CAMERA_PEERS.set(toSocketId,pc);state.localStream.getTracks().forEach(t=>pc.addTrack(t,state.localStream));pc.onicecandidate=e=>{if(e.candidate)state.socket?.emit('webrtc_ice',{to:toSocketId,candidate:e.candidate,kind:'cam'});};pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')pc.restartIce();};const offer=await pc.createOffer();await pc.setLocalDescription(offer);state.socket?.emit('webrtc_offer',{to:toSocketId,offer:pc.localDescription,kind:'cam'});}
async function onCamOffer(socket,fromSocketId,offer){closeCamPeer(fromSocketId);const pc=new RTCPeerConnection(CAM_ICE);CAMERA_PEERS.set(fromSocketId,pc);pc.onicecandidate=e=>{if(e.candidate)socket?.emit('webrtc_ice',{to:fromSocketId,candidate:e.candidate,kind:'cam'});};pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')pc.restartIce();};pc.ontrack=e=>{const stream=e.streams?.[0]||new MediaStream([e.track]);showRemoteCam(fromSocketId,stream);};await pc.setRemoteDescription(new RTCSessionDescription(offer));const answer=await pc.createAnswer();await pc.setLocalDescription(answer);socket?.emit('webrtc_answer',{to:fromSocketId,answer:pc.localDescription,kind:'cam'});}
async function onCamAnswer(fromSocketId,answer){const pc=CAMERA_PEERS.get(fromSocketId);if(!pc||pc.signalingState==='stable')return;try{await pc.setRemoteDescription(new RTCSessionDescription(answer));}catch(e){console.warn('[CAM]',e);}}
async function onCamIce(fromSocketId,candidate){const pc=CAMERA_PEERS.get(fromSocketId);if(!pc||!candidate)return;try{await pc.addIceCandidate(new RTCIceCandidate(candidate));}catch{}}
function closeCamPeer(socketId){const pc=CAMERA_PEERS.get(socketId);if(pc){try{pc.close();}catch{}CAMERA_PEERS.delete(socketId);}}
function showRemoteCam(socketId,stream){
  const spyV=document.querySelector(`[data-spysock="${socketId}"] video`);if(spyV){spyV.srcObject=stream;spyV.play?.().catch(()=>{});return;}
  const thumbV=$('camStrip').querySelector(`[data-csock="${socketId}"] video`);if(thumbV){thumbV.srcObject=stream;thumbV.play?.().catch(()=>{});return;}
  $('camVideo').srcObject=stream;$('camModalTitle').textContent='📷 '+(state.onlineUsers.find(u=>u.socketId===socketId)?.nickname||'كاميرا');$('camModal').style.display='flex';
}

function showCtx(e,target){
  e.preventDefault();e.stopPropagation();
  const menu=$('ctxMenu'),list=$('ctxList');list.innerHTML='';
  const myLevel=ROLE_LEVELS[state.user.role]||0;const targetLevel=ROLE_LEVELS[target.role]||0;
  const adm=isAdmin();const canAct=myLevel>targetLevel&&!target.isOwner;
  const add=(icon,lbl,fn,cls='')=>{const li=el('li',cls,icon+' '+lbl);if(fn)li.addEventListener('click',()=>{fn();hideCtx();});else li.className='ctx-hdr';list.appendChild(li);};
  const sep=()=>list.appendChild(el('li','ctx-sep'));
  add('',target.nickname,null,'ctx-hdr');
  add('💬','رسالة خاصة',()=>openPm(target));
  if(adm&&target.socketId)add('🔒','همسة',()=>doWhisper(target));
  add('ℹ','معلومات',()=>showUserInfo(target));
  if(adm&&target.userId!==state.user.id&&canAct){
    sep();
    const onStage=state.stageUsers.some(s=>s.userId===target.userId);
    if(onStage)add('🎤','سحب الميكروفون',()=>state.socket?.emit('revoke_mic',{toSocketId:target.socketId}));
    else add('🎤','منح الميكروفون',()=>state.socket?.emit('grant_mic',{toSocketId:target.socketId,toNickname:target.nickname}));
    add('🔇','كتم',()=>openMuteDialog(target));
    if(target.isMuted)add('🔊','رفع الكتم',()=>state.socket?.emit('unmute_user',{targetSocketId:target.socketId}));
    add('📷','إيقاف الكاميرا',()=>state.socket?.emit('force_cam_off_target',{targetSocketId:target.socketId}));
    if(state.user.permissions?.dragToRoom||isOwner())add('🚪','نقل إلى غرفة',()=>openDragToRoomDialog(target));
    sep();
    add('🥾','طرد',()=>kickUser(target),'ctx-danger');
    add('🚫','حظر',()=>banUser(target),'ctx-danger');
    add('👑','تغيير الرتبة',()=>changeRole(target));
    add('🔑','الصلاحيات',()=>openPermDialog(target));
  }
  if(isOwner()&&target.userId!==state.user.id){sep();if(target.ip||target.fingerprint)add('🚫','حظر بالجهاز/IP',()=>openBanLogDialog(target),'ctx-danger');}
  const x=Math.min(e.clientX,window.innerWidth-200);const y=Math.min(e.clientY,window.innerHeight-350);
  menu.style.top=y+'px';menu.style.left=x+'px';menu.style.display='block';bringToFront(menu);
  setTimeout(()=>document.addEventListener('click',hideCtx,{once:true}),0);
}
function hideCtx(){$('ctxMenu').style.display='none';}

function openBanLogDialog(target){
  const reason=prompt('سبب الحظر:')||'';
  const byIp=confirm('حظر بالـ IP؟ ('+(target.ip||'غير متوفر')+')');
  const byMachine=confirm('حظر بالجهاز (fingerprint)؟');
  if(!byIp&&!byMachine){toast('لم يتم الحظر — يجب اختيار طريقة','error');return;}
  // fix #14 — pass userId so ban appears in banned list
  state.socket?.emit('ban_from_log',{nickname:target.nickname,ip:target.ip||'',fingerprint:target.fingerprint||'',reason,byIp,byMachine,targetUserId:target.userId||target.id||null});
}

async function showUserInfo(target){
  // fix #6 — show IP/country for guests from target data (no DB entry)
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
function openDragToRoomDialog(target){const roomName=prompt('اسم الغرفة:\n'+state.rooms.map(r=>r.name).join('\n'));const room=state.rooms.find(r=>r.name===roomName);if(room)state.socket?.emit('drag_user_to_room',{targetSocketId:target.socketId,roomId:room.id});}
function doWhisper(target){const msg=prompt('همسة إلى '+target.nickname+':');if(msg?.trim())state.socket?.emit('whisper',{toSocketId:target.socketId,toNickname:target.nickname,content:msg.trim()});}
async function kickUser(target){const r=prompt('سبب الطرد:')||'';state.socket?.emit('kick_user',{targetSocketId:target.socketId,reason:r});}
async function banUser(target){const r=prompt('سبب الحظر:')||'';const d=prompt('المدة بالساعات (فارغ=دائم):');const duration=d?parseInt(d):null;try{await api('/admin/ban/'+target.userId,'POST',{reason:r,duration,fingerprint:target.fingerprint,ip:target.ip});state.socket?.emit('force_ban',{targetSocketId:target.socketId,reason:r});toast('تم حظر '+target.nickname,'success');}catch(e){toast(e.message,'error');}}

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
  $('permUserName').textContent=target.nickname+' ('+( ROLE_LBL[target.role]||target.role)+')';
  const container=$('permCheckboxes');container.innerHTML='';

  // Parse existing permissions — handle both object and JSON string
  let existing={};
  if(target.permissions){
    if(typeof target.permissions==='string'){
      try{existing=JSON.parse(target.permissions);}catch{existing={};}
    } else if(typeof target.permissions==='object'){
      existing={...target.permissions};
    }
  }

  // Determine which perms are valid for this role level
  // Higher rank admin can grant OR REMOVE any permission from lower rank
  const myLevel=ROLE_LEVELS[state.user.role]||0;
  const targetLevel=ROLE_LEVELS[target.role]||0;
  const canEdit=isOwner()||(myLevel>targetLevel);

  // Max perms the target role is allowed to have
  const maxPerms=RANK_PERMS[target.role]||PERMS_LIST.map(p=>p.key);

  PERMS_LIST.forEach(p=>{
    const withinRank=Array.isArray(maxPerms)?maxPerms.includes(p.key):true;
    const isGranted=existing[p.key]===true||existing[p.key]==='true';
    const lbl=el('label','chk-row');

    // Show: granted=checked, can edit if higher rank AND within role's max perms
    const editable=canEdit&&withinRank;
    lbl.className='chk-row'+(withinRank?'':' perm-disabled');

    const checkbox=document.createElement('input');
    checkbox.type='checkbox';
    checkbox.id='perm_'+p.key;
    checkbox.checked=isGranted;
    checkbox.disabled=!editable;

    // Visual indicator: green=granted, grey=not granted
    const span=document.createElement('span');
    span.textContent=p.label;
    if(isGranted) span.style.color='#007700';

    // Update span color on change
    checkbox.addEventListener('change',()=>{
      span.style.color=checkbox.checked?'#007700':'';
    });

    if(!withinRank) lbl.title='خارج نطاق رتبة '+( ROLE_LBL[target.role]||target.role);
    if(!canEdit&&withinRank) lbl.title='يجب أن تكون برتبة أعلى لتعديل هذه الصلاحية';

    lbl.appendChild(checkbox);lbl.appendChild(span);
    container.appendChild(lbl);
  });

  // Show summary of currently granted perms
  const grantedList=PERMS_LIST.filter(p=>existing[p.key]===true||existing[p.key]==='true').map(p=>p.label);
  const summary=$('permSummary');
  if(summary){
    summary.textContent=grantedList.length?'الصلاحيات الممنوحة: '+grantedList.join('، '):'لا توجد صلاحيات ممنوحة';
    summary.style.color=grantedList.length?'#007700':'#888';
  }

  $('permModal').style.display='flex';bringToFront($('permModal'));
}
async function savePermissions(){
  if(!state.permTarget)return;

  // Read all checkboxes including disabled ones (keep existing value for disabled)
  let existing={};
  if(state.permTarget.permissions){
    if(typeof state.permTarget.permissions==='string'){try{existing=JSON.parse(state.permTarget.permissions);}catch{}}
    else if(typeof state.permTarget.permissions==='object'){existing={...state.permTarget.permissions};}
  }

  const perms={};
  PERMS_LIST.forEach(p=>{
    const cb=$('perm_'+p.key);
    if(cb&&!cb.disabled){
      // Editable — use checkbox value
      perms[p.key]=cb.checked;
    } else {
      // Not editable — preserve existing value
      perms[p.key]=existing[p.key]||false;
    }
  });

  console.log('[Perms] Saving for',state.permTarget.nickname,':',perms);

  try{
    await api('/admin/permissions/'+state.permTarget.userId,'PATCH',{permissions:perms});
    state.socket?.emit('set_permissions',{targetUserId:state.permTarget.userId,permissions:perms});
    $('permModal').style.display='none';
    toast('تم حفظ الصلاحيات ✓','success');
    loadAccountsPanel();
  } catch(e){
    // API failed — try socket only
    console.warn('API perm save failed, using socket:',e.message);
    state.socket?.emit('set_permissions',{targetUserId:state.permTarget.userId,permissions:perms});
    $('permModal').style.display='none';
    toast('تم إرسال الصلاحيات ✓','info');
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
    $('talkBtn').classList.remove('active');$('muteBtn').classList.remove('active');
    playSound('mic_off');toast('🎤 تم إيقاف الميكروفون','info');
  } else {
    // fix #2 — owner & admins always get free mic
    if(isOwner()||isAdmin()||state.roomSettings.freeMic&&!state.roomSettings.requireHand){
      const ok=await Voice.startSpeaking(state.socket,state.currentRoom.id,state.deviceSettings.micId||null,state.roomSettings.maxMicTime||0);
      if(ok){state.micActive=true;$('talkBtn').classList.add('active');playSound('mic_on');}
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
      $('muteBtn').classList.toggle('active',muted);
      $('muteBtn').style.background=muted?'linear-gradient(to bottom,#cc0000,#990000)':'';
      $('muteBtn').querySelector('span:first-child').textContent=muted?'🔇':'🔊';
      $('muteBtn').querySelector('span:last-child').textContent=muted?'إلغاء الكتم':'كتم نفسي';
      toast(muted?'🔇 تم كتم الميكروفون':'🔊 رُفع الكتم','info');
      state.socket?.emit('speaking',{isSpeaking:false});
      return;
    }
  }
  // No mic active — mute/unmute all audio (speakers)
  const allAudio=document.querySelectorAll('audio');
  const anyMuted=[...allAudio].some(a=>a.muted);
  allAudio.forEach(a=>a.muted=!anyMuted);
  $('muteBtn').classList.toggle('active',!anyMuted);
  $('muteBtn').style.background=!anyMuted?'linear-gradient(to bottom,#cc0000,#990000)':'';
  toast(!anyMuted?'🔇 تم كتم الصوت':'🔊 رُفع الكتم','info');
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
      state.localStream=await navigator.mediaDevices.getUserMedia(constraints);
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
  if(file.size>2*1024*1024){toast('الصورة كبيرة جداً (الحد 2MB)','error');return;}
  const reader=new FileReader();reader.onload=e=>state.socket?.emit('send_message',{roomId:state.currentRoom.id,content:'[صورة]',type:'image',imageData:e.target.result,replyTo:null,textColor:'#000000',fontSize:14,bold:false,italic:false});reader.readAsDataURL(file);
}
function startReply(mid,content,nick){state.replyTo=mid;$('replySnippet').textContent=nick+': '+content.slice(0,60);$('replyBar').style.display='flex';$('msgInput').focus();}
function cancelReply(){state.replyTo=null;$('replyBar').style.display='none';}
async function delMsg(mid,lineEl){if(!confirm('حذف الرسالة؟'))return;try{await api('/messages/'+mid,'DELETE');lineEl.querySelector('.msg-text').textContent='[تم حذف هذه الرسالة]';lineEl.querySelector('.msg-text').style.cssText='color:#aaa;font-style:italic';}catch(e){toast(e.message,'error');}}
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
  const fromName=sent?'أنت':(msg.from_nickname||msg.from_username||'مجهول');
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

function openAddRoom(){state.editingRoom=null;$('roomModalTitle').textContent='إضافة غرفة';$('roomName').value='';$('roomDesc').value='';$('roomPrivate').checked=false;$('deleteRoomBtn').style.display='none';$('roomMsg').textContent='';state.selectedRoomIcon='💬';$('roomIconGrid').querySelectorAll('.ri-opt').forEach(o=>o.classList.toggle('selected',o.textContent==='💬'));$('roomModal').style.display='flex';bringToFront($('roomModal'));}
function openEditRoom(room){state.editingRoom=room;$('roomModalTitle').textContent='تعديل الغرفة';$('roomName').value=room.name;$('roomDesc').value=room.description||'';$('roomPrivate').checked=room.is_private;$('deleteRoomBtn').style.display='';$('roomMsg').textContent='';state.selectedRoomIcon=room.icon||'💬';$('roomIconGrid').querySelectorAll('.ri-opt').forEach(o=>o.classList.toggle('selected',o.textContent===room.icon));$('roomModal').style.display='flex';bringToFront($('roomModal'));}
async function saveRoom(){
  const name=$('roomName').value.trim(),desc=$('roomDesc').value.trim(),priv=$('roomPrivate').checked,icon=state.selectedRoomIcon;
  if(!name){$('roomMsg').textContent='الاسم مطلوب';$('roomMsg').className='info-msg error';return;}
  if(!state.token){$('roomMsg').textContent='يجب تسجيل الدخول أولاً';$('roomMsg').className='info-msg error';return;}
  $('roomMsg').textContent='جاري الحفظ...';
  try{
    // fix #7 — use correct endpoint and verify auth token exists
    if(state.editingRoom&&state.editingRoom.id){
      await api('/rooms/'+state.editingRoom.id,'PATCH',{name,description:desc,icon,is_private:priv});
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
async function deleteRoom(){if(!confirm('حذف هذه الغرفة؟'))return;try{await api('/rooms/'+state.editingRoom.id,'DELETE');$('roomModal').style.display='none';if(state.currentRoom?.id===state.editingRoom.id){state.currentRoom=null;$('messagesArea').innerHTML='';}await loadRooms();toast('تم حذف الغرفة','success');}catch(e){toast(e.message,'error');}}
async function openRules(){if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}try{const r=await api('/rooms/'+state.currentRoom.id);$('rulesDisplay').textContent=r.rules||'';$('rulesEdit').value=r.rules||'';}catch{}$('rulesEdit').style.display='none';$('saveRulesBtn').style.display='none';$('rulesModal').style.display='flex';bringToFront($('rulesModal'));}
async function saveRules(){try{await api('/rooms/'+state.currentRoom.id,'PATCH',{rules:$('rulesEdit').value});$('rulesDisplay').textContent=$('rulesEdit').value;$('rulesEdit').style.display='none';$('saveRulesBtn').style.display='none';toast('تم حفظ القواعد ✓','success');}catch(e){toast(e.message,'error');}}

function openProfile(){const u=state.user;$('profAvatarBig').textContent=u.avatar||'🌙';$('profNick').value=u.nickname||'';$('profBio').value=u.bio||'';$('profColorInput').value=state.textColor;$('profColorPreview').textContent=state.textColor;state.selectedAvatar=u.avatar||'🌙';$('profileAvatarGrid').querySelectorAll('.av-opt').forEach(o=>o.classList.toggle('selected',o.textContent===state.selectedAvatar));$('profileModal').style.display='flex';bringToFront($('profileModal'));$('profMsg').textContent='';}
async function saveProfile(){try{const textColor=$('profColorInput').value;const u=await api('/users/me/profile','PATCH',{nickname:$('profNick').value.trim(),bio:$('profBio').value.trim(),avatar:state.selectedAvatar,text_color:textColor});state.user={...state.user,...u};localStorage.setItem('sahar_user',JSON.stringify(state.user));$('myAvatarEl').textContent=state.user.avatar;$('myNickEl').textContent=state.user.nickname;applyColor(textColor);$('profMsg').textContent='تم الحفظ ✓';$('profMsg').className='info-msg success';}catch(e){$('profMsg').textContent=e.message;$('profMsg').className='info-msg error';}}
async function changePass(){const c=$('curPass').value,n=$('newPass').value;if(!c||!n){$('profMsg').textContent='أدخل كلمتي المرور';$('profMsg').className='info-msg error';return;}try{await api('/users/me/password','PATCH',{currentPassword:c,newPassword:n});$('curPass').value='';$('newPass').value='';$('profMsg').textContent='تم التغيير ✓';$('profMsg').className='info-msg success';}catch(e){$('profMsg').textContent=e.message;$('profMsg').className='info-msg error';}}

function openRoomManage(){$('roomManagePanel').style.display='flex';bringToFront($('roomManagePanel'));loadAccountsPanel();}
function switchRmPanel(name){
  document.querySelectorAll('.rm-nav-item').forEach(i=>i.classList.toggle('active',i.dataset.panel===name));
  document.querySelectorAll('.rm-panel').forEach(p=>p.classList.remove('active'));
  const panel=$('rmp-'+name);if(panel)panel.classList.add('active');
  if(name==='accounts')loadAccountsPanel();
  if(name==='banned')loadBannedPanel();
  if(name==='logs'||name==='adminlogs'){state.socket?.emit('basil_get_logs');state.socket?.emit('owner_get_logs');renderManageLogs();}
  if(name==='rooms')loadRoomsPanel();
  if(name==='allusers'){state.socket?.emit('basil_get_online_all');state.socket?.emit('owner_get_online_all');}
}

async function loadAccountsPanel(){
  try{
    const users=await api('/admin/users');
    const q=($('accountSearch')?.value||'').toLowerCase();
    const filtered=users.filter(u=>u.nickname.toLowerCase().includes(q)||u.username.includes(q));
    const body=$('accountsBody');body.innerHTML='';
    let members=0,mods=0,admins=0,masters=0;
    filtered.forEach(u=>{
      if(u.role==='master')masters++;else if(u.role==='super_admin')admins++;else if(u.role==='moderator')mods++;else members++;
      const tr=document.createElement('tr');
      // Store permissions safely — escape for inline onclick
const permJson=JSON.stringify(u.permissions||{}).replace(/'/g,"\'").replace(/"/g,'&quot;');
tr.innerHTML=`<td><b style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</b><br><small>${u.username}</small></td>
<td><span style="color:${ROLE_COLORS[u.role]||'#000'};font-weight:700">${ROLE_LBL[u.role]||u.role}</span></td>
<td>${u.status==='online'?'🟢':'⚫'} ${u.status||'offline'}</td>
<td dir="ltr" style="font-size:10px">${u.last_ip||'-'}</td>
<td>${u.country||'-'}</td>
<td style="white-space:nowrap">
  <button class="rm-btn" onclick="changeRole({userId:'${u.id}',nickname:'${u.nickname}',role:'${u.role}'})">رتبة</button>
  <button class="rm-btn" onclick="window._openPerm('${u.id}','${u.nickname}','${u.role}')">صلاحيات</button>
  <button class="rm-btn rm-btn-red" onclick="confirmDeleteUser('${u.id}','${u.nickname}')">حذف</button>
</td>`;
// Store permissions on the row for retrieval
tr.dataset.userid=u.id;
tr.dataset.perms=JSON.stringify(u.permissions||{});
      body.appendChild(tr);
    });
    $('cntMembers').textContent=members;$('cntMods').textContent=mods;$('cntAdmins').textContent=admins;
    if($('cntMasters'))$('cntMasters').textContent=masters;$('cntTotal').textContent=filtered.length;
  }catch(e){toast('خطأ في تحميل الحسابات: '+e.message,'error');}
}
// Helper to open perm dialog — reads stored perms from data attribute
window._openPerm = function(userId, nickname, role) {
  // dataset.userId in JS = data-user-id attribute in DOM
  const row=document.querySelector(`[data-userid="${userId}"]`);
  let permissions={};
  if(row&&row.dataset.perms){try{permissions=JSON.parse(row.dataset.perms);}catch{}}
  openPermDialog({userId,nickname,role,permissions});
};

async function confirmDeleteUser(userId,nickname){if(!confirm('حذف المستخدم '+nickname+'؟'))return;try{await api('/admin/users/'+userId,'DELETE');toast('تم الحذف ✓','success');loadAccountsPanel();}catch(e){toast(e.message,'error');}}
async function loadBannedPanel(){try{const bans=await api('/admin/bans');const body=$('bannedBody');body.innerHTML='';bans.forEach(b=>{const tr=document.createElement('tr');const rem=b.expires_at?new Date(b.expires_at).toLocaleString('ar'):'دائم';tr.innerHTML=`<td>${b.users?.nickname||'-'}</td><td dir="ltr" style="font-size:9px">${b.fingerprint||b.ip||'-'}</td><td>-</td><td>${b.reason||'-'}</td><td>${new Date(b.created_at).toLocaleString('ar')}</td><td>${rem}</td><td><button class="rm-btn rm-btn-green" onclick="unbanUser('${b.user_id}')">رفع</button></td>`;body.appendChild(tr);});}catch(e){console.error(e);}}
async function unbanUser(userId){try{await api('/admin/ban/'+userId,'DELETE');toast('تم رفع الحظر','success');loadBannedPanel();}catch(e){toast(e.message,'error');}}
function loadRoomsPanel(){const body=$('roomsBody');body.innerHTML='';state.rooms.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r.icon}</td><td><b>${r.name}</b>${r.is_private?' 🔐':''}</td><td>${r.description||'-'}</td><td>${r.is_private?'✓':''}</td><td>${r._locked?'🔒':'لا'}</td><td><button class="rm-btn" onclick="openEditRoom(state.rooms.find(x=>x.id==='${r.id}'))">تعديل</button>${isOwner()?`<button class="rm-btn" onclick="openRoomLockDialog('${r.id}')">🔒</button>`:''}`;body.appendChild(tr);});}
function renderManageLogs(){
  const lb=$('logsBody');if(lb){lb.innerHTML='';state.roomLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.nickname}</b></td><td dir="ltr" style="font-size:9px">${l.ip||'-'}</td><td>${l.country||'-'}</td><td>${l.joinedAt?new Date(l.joinedAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt?new Date(l.leftAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt&&l.joinedAt?Math.round((new Date(l.leftAt)-new Date(l.joinedAt))/60000)+'د':'متصل'}</td><td><button class="rm-btn rm-btn-red" style="font-size:9px;padding:2px 6px" onclick="openBanLogDialog({nickname:'${l.nickname}',ip:'${l.ip||''}',fingerprint:'${l.fp||''}'})">حظر</button></td>`;lb.appendChild(tr);});}
  const ab=$('adminLogsBody');if(ab){ab.innerHTML='';state.adminLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.by}</b></td><td>${l.action}</td><td>${l.target}</td><td>${l.date}</td>`;ab.appendChild(tr);});}
}
function saveVoiceSettings(){state.roomSettings.freeMic=$('vs-freemic').checked;state.roomSettings.requireHand=$('vs-requirehand').checked;state.roomSettings.maxMicTime=parseInt($('vs-maxtime').value)||0;state.roomSettings.maxSpeakers=parseInt($('vs-maxspeakers').value)||1;if(state.currentRoom)state.socket?.emit('save_voice_settings',{roomId:state.currentRoom.id,settings:{maxSpeakers:state.roomSettings.maxSpeakers,maxMicTime:state.roomSettings.maxMicTime,freeMic:state.roomSettings.freeMic}});toast('تم حفظ إعدادات الصوت ✓','success');}
function saveWebcamSettings(){state.roomSettings.camAllow=$('wc-allow').checked;state.roomSettings.camRequireApproval=$('wc-requireapproval').checked;state.roomSettings.whoCan=$('wc-whoCan').value;state.roomSettings.maxCams=parseInt($('wc-maxcams').value)||5;toast('تم حفظ إعدادات الكاميرا ✓','success');}
function saveDesignSettings(){if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}const design={bgColor:$('d-bgColor')?.value||'',chatBg:$('d-chatBg')?.value||'',panelBg:$('d-panelBg')?.value||'',toolbarBg:$('d-toolbarBg')?.value||'',welcomeMsg:$('d-welcomeMsg')?.value||''};state.socket?.emit('save_room_design',{roomId:state.currentRoom.id,design});toast('تم تطبيق التصميم على الجميع ✓','success');}
function saveAdvancedSettings(){
  state.roomSettings.noAvatars=$('adv-noAvatars').checked;
  state.roomSettings.noURLs=$('adv-noURLs').checked;
  // fix #8 — guest PM setting
  state.roomSettings.guestPmAllowed=$('adv-guestPm').checked;
  if(state.currentRoom)state.socket?.emit('save_voice_settings',{roomId:state.currentRoom.id,settings:{guestPmAllowed:state.roomSettings.guestPmAllowed}});
  renderUsers();toast('تم حفظ الإعدادات ✓','success');
}
function saveSoundSettings(){state.soundsEnabled=!$('soundDisable').checked;state.socket?.emit('set_sound_prefs',{disabled:!state.soundsEnabled});toast(state.soundsEnabled?'الأصوات مفعّلة 🔊':'الأصوات معطّلة 🔇','info');}

async function doAddAccount(){
  const u=$('newAccUser').value.trim().toLowerCase(),p=$('newAccPass').value,r=$('newAccRole').value;
  if(!u||!p){$('addAccountMsg').textContent='البيانات مطلوبة';$('addAccountMsg').className='info-msg error';return;}
  const perms={};PERMS_LIST.forEach(pr=>{perms[pr.key]=$('nacp_'+pr.key)?.checked||false;});
  $('addAccountMsg').textContent='جاري الإنشاء...';
  try{
    await api('/auth/register','POST',{username:u,nickname:u,password:p,avatar:'🌙',fingerprint:''});
    const users=await api('/admin/users');const newUser=users.find(x=>x.username===u);
    if(newUser){if(r!=='user')await api('/admin/role/'+newUser.id,'PATCH',{role:r});await api('/admin/permissions/'+newUser.id,'PATCH',{permissions:perms});}
    $('addAccountModal').style.display='none';$('addAccountMsg').textContent='';toast('تم إنشاء الحساب ✓','success');loadAccountsPanel();
  }catch(e){$('addAccountMsg').textContent=e.message;$('addAccountMsg').className='info-msg error';}
}

function openSpyPanel(){$('spyPanel').style.display='flex';bringToFront($('spyPanel'));state.socket?.emit('basil_get_all_rooms');state.socket?.emit('owner_get_all_rooms');state.socket?.emit('spy_pms');state.socket?.emit('basil_get_logs');state.socket?.emit('owner_get_logs');state.socket?.emit('basil_get_online_all');state.socket?.emit('owner_get_online_all');}
function renderSpyRooms(){const list=$('spyRoomList');if(!list)return;list.innerHTML='';state.spyRooms.forEach(r=>{const li=el('li','spy-room-item',r.icon+' '+r.name);li.addEventListener('click',()=>{document.querySelectorAll('.spy-room-item').forEach(i=>i.classList.remove('active'));li.classList.add('active');if($('spyCurrentRoom'))$('spyCurrentRoom').textContent=r.name;state.socket?.emit('spy_room',{roomId:r.id});});list.appendChild(li);});}
function renderSpyHistory(roomId){const msgs=state.spyMessages[roomId]||[];const area=$('spyMessages');if(!area)return;area.innerHTML='';if(!msgs.length){area.innerHTML='<div style="color:#668866;padding:10px">لا توجد رسائل</div>';return;}msgs.forEach(m=>{const d=el('div','spy-msg-line');d.innerHTML=`<span class="spy-ts">[${fmtTime(m.created_at||m.createdAt)}]</span> <b style="color:#cc88ff">${m.nickname||m.username||'?'}:</b> <span style="color:#ccaaee">${m.type==='image'?'[صورة]':(m.content||'')}</span>`;area.appendChild(d);});area.scrollTop=area.scrollHeight;}
function renderSpyPms(){const list=$('spyPmList');if(!list)return;list.innerHTML='';if(!state.spyPms.length){list.innerHTML='<div style="color:#668866;padding:10px">لا توجد رسائل خاصة</div>';return;}state.spyPms.forEach(m=>{const d=el('div','spy-msg-line');d.innerHTML=`<span class="spy-ts">[${fmtTime(m.created_at)}]</span> <b style="color:#ff88cc">${m.from_username}→${m.to_username}:</b> <span style="color:#ccaaee">${m.content}</span>`;list.appendChild(d);});}
function appendSpyLog(text,time){const area=$('spyLiveLog');if(!area)return;const d=el('div','spy-msg-line');d.innerHTML=`<span class="spy-ts">[${fmtTime(time)}]</span> <span style="color:#88ffaa">${text}</span>`;area.appendChild(d);area.scrollTop=area.scrollHeight;}
function renderSpyLogs(){const lb=$('spyLogsBody');if(!lb)return;lb.innerHTML='';state.roomLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.nickname}</b></td><td dir="ltr" style="font-size:9px">${l.ip||'-'}</td><td>${l.country||'-'}</td><td>${l.joinedAt?new Date(l.joinedAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt?new Date(l.leftAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt&&l.joinedAt?Math.round((new Date(l.leftAt)-new Date(l.joinedAt))/60000)+'د':'متصل'}</td><td><button class="rm-btn rm-btn-red" style="font-size:9px;padding:2px 6px" onclick="openBanLogDialog({nickname:'${l.nickname}',ip:'${l.ip||''}',fingerprint:'${l.fp||''}'})">حظر</button></td>`;lb.appendChild(tr);});const ab=$('spyAdminLogsBody');if(!ab)return;ab.innerHTML='';state.adminLogs.slice(0,100).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.by}</b></td><td>${l.action}</td><td>${l.target}</td><td>${l.date}</td>`;ab.appendChild(tr);});}
function renderAllOnline(users){[$('allOnlineBody'),$('allOnlineBodySpy')].forEach(body=>{if(!body)return;body.innerHTML='';users.forEach(u=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${u.avatar||'🌙'} <b style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</b></td><td style="color:${ROLE_COLORS[u.role]||'#000'}">${ROLE_LBL[u.role]||u.role}</td><td>${u.roomId?state.rooms.find(r=>r.id===u.roomId)?.name||'-':'-'}</td><td dir="ltr" style="font-size:9px">${u.ip||'-'}</td><td>${u.country||'-'}</td><td dir="ltr" style="font-size:9px">${(u.fingerprint||'').slice(0,14)}...</td><td><button class="rm-btn rm-btn-red" style="font-size:9px;padding:2px 6px" onclick="openBanLogDialog({nickname:'${u.nickname}',ip:'${u.ip||''}',fingerprint:'${u.fingerprint||''}'})">حظر</button></td>`;body.appendChild(tr);});});}
function openRoomLockDialog(roomId){state._lockingRoomId=roomId;$('roomPassInput').value='';$('roomPassModal').style.display='flex';bringToFront($('roomPassModal'));}

function toggleUndercover(){if(!isOwner())return;state.undercover=!state.undercover;const btn=$('undercoverBtn');if(btn){btn.textContent='👁 التخفي: '+(state.undercover?'مفعّل':'معطّل');btn.style.background=state.undercover?'linear-gradient(to bottom,#800080,#600060)':'';}let ind=document.querySelector('.undercover-bar');if(state.undercover){if(!ind){ind=el('div','undercover-bar','👁 وضع التخفي مفعّل');document.body.appendChild(ind);}}else{ind?.remove();}toast(state.undercover?'👁 وضع التخفي مفعّل':'👁 وضع التخفي معطّل','info');if(state.currentRoom&&state.socket){state.socket.disconnect();setTimeout(()=>{state.socket=null;connectSocket();setTimeout(()=>joinRoom(state.currentRoom,state.undercover,''),1500);},500);}}
function initSpyNav(){document.querySelectorAll('.spy-nav-item').forEach(item=>{item.addEventListener('click',()=>{document.querySelectorAll('.spy-nav-item').forEach(i=>i.classList.remove('active'));document.querySelectorAll('.spy-panel').forEach(p=>p.classList.remove('active'));item.classList.add('active');const p=$('spp-'+item.dataset.sp);if(p)p.classList.add('active');if(item.dataset.sp==='online'){state.socket?.emit('basil_get_online_all');state.socket?.emit('owner_get_online_all');}if(item.dataset.sp==='pms')state.socket?.emit('spy_pms');if(item.dataset.sp==='logs'){state.socket?.emit('basil_get_logs');state.socket?.emit('owner_get_logs');}if(item.dataset.sp==='rooms'){state.socket?.emit('basil_get_all_rooms');state.socket?.emit('owner_get_all_rooms');}});});}

function doLogout(){Voice.cleanup();state.localStream?.getTracks().forEach(t=>t.stop());state.socket?.disconnect();state.socket=null;api('/auth/logout','POST').catch(()=>{});localStorage.removeItem('sahar_token');localStorage.removeItem('sahar_user');state.token=null;state.user=null;state.currentRoom=null;$('chatScreen').classList.remove('active');$('loginScreen').classList.add('active');}
function toast(msg,type='info'){const t=el('div','toast '+type,msg);$('toastContainer').appendChild(t);setTimeout(()=>t.remove(),3500);}

function toggleUsersPanel(){const panel=document.querySelector('.users-panel'),rooms=document.querySelector('.rooms-panel'),backdrop=$('panelBackdrop'),isOpen=panel.classList.contains('open');rooms.classList.remove('open');if(isOpen){panel.classList.remove('open');backdrop.classList.remove('show');}else{panel.classList.add('open');backdrop.classList.add('show');}}
function toggleRoomsPanel(){const panel=document.querySelector('.rooms-panel'),users=document.querySelector('.users-panel'),backdrop=$('panelBackdrop'),isOpen=panel.classList.contains('open');users.classList.remove('open');if(isOpen){panel.classList.remove('open');backdrop.classList.remove('show');}else{panel.classList.add('open');backdrop.classList.add('show');}}
function closeMobilePanels(){if(window.innerWidth<=768){document.querySelector('.users-panel')?.classList.remove('open');document.querySelector('.rooms-panel')?.classList.remove('open');$('panelBackdrop')?.classList.remove('show');}}

function bindChat(){
  $('sendBtn').addEventListener('click',sendMsg);
  $('msgInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});
  $('msgInput').addEventListener('input',()=>{autoResize($('msgInput'));startTyping();});
  $('emojiBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('emojiPicker');p.style.display=p.style.display==='none'?'flex':'none';if(p.style.display==='flex')bringToFront(p);});
  document.addEventListener('click',()=>{$('emojiPicker').style.display='none';$('colorPanel').style.display='none';const sw=$('statusPickerWrap');if(sw)sw.style.display='none';});
  $('colorBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('colorPanel');p.style.display=p.style.display==='none'?'block':'none';if(p.style.display==='block')bringToFront(p);});
  $('applyCustomColor').addEventListener('click',()=>{applyColor($('customColorInput').value);$('colorPanel').style.display='none';});
  document.querySelectorAll('.fsize').forEach(btn=>btn.addEventListener('click',()=>{state.fontSize=parseInt(btn.dataset.size);$('msgInput').style.fontSize=state.fontSize+'px';document.querySelectorAll('.fsize').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}));
  $('boldBtn').addEventListener('click',()=>{state.bold=!state.bold;$('boldBtn').classList.toggle('active',state.bold);$('msgInput').style.fontWeight=state.bold?'700':'400';});
  $('italicBtn').addEventListener('click',()=>{state.italic=!state.italic;$('italicBtn').classList.toggle('active',state.italic);$('msgInput').style.fontStyle=state.italic?'italic':'normal';});
  $('imageBtn')?.addEventListener('click',()=>$('imageInput').click());
  $('imageInput')?.addEventListener('change',e=>{if(e.target.files[0])sendImage(e.target.files[0]);e.target.value='';});
  $('talkBtn').addEventListener('click',toggleTalk);
  $('muteBtn').addEventListener('click',toggleMuteBtn);
  $('camBtn').addEventListener('click',toggleCam);
  $('camSettingsBtn').addEventListener('click',openDeviceSettings);
  $('handBtn').addEventListener('click',()=>{if(state.handRaised){state.socket?.emit('lower_hand');state.handRaised=false;$('handBtn').classList.remove('active');toast('✋ تم إنزال يدك','info');}else{state.socket?.emit('raise_hand');state.handRaised=true;$('handBtn').classList.add('active');toast('✋ تم رفع يدك','info');}});
  $('clearChatBtn')?.addEventListener('click',()=>{if(confirm('مسح جميع رسائل الغرفة؟'))state.socket?.emit('clear_chat',{roomId:state.currentRoom?.id});});
  $('addRoomBtn')?.addEventListener('click',openAddRoom);
  $('roomManageBtn')?.addEventListener('click',openRoomManage);
  $('rulesBtn').addEventListener('click',openRules);
  $('leaveRoomBtn').addEventListener('click',()=>{
    // Instant audio cut on explicit room leave
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
  $('addRoomManageBtn')?.addEventListener('click',()=>{$('roomManagePanel').style.display='none';openAddRoom();});
  $('addAccountBtn')?.addEventListener('click',()=>{$('addAccountModal').style.display='flex';bringToFront($('addAccountModal'));});
  $('closeAddAccount')?.addEventListener('click',()=>$('addAccountModal').style.display='none');
  $('cancelAddAccount')?.addEventListener('click',()=>$('addAccountModal').style.display='none');
  $('doAddAccount')?.addEventListener('click',doAddAccount);
  $('closeMuteModal')?.addEventListener('click',()=>$('muteModal').style.display='none');
  $('doMuteBtn')?.addEventListener('click',doMute);
  $('cancelMuteBtn')?.addEventListener('click',()=>$('muteModal').style.display='none');
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
  $('clearLogsBtn')?.addEventListener('click',()=>{if(confirm('مسح جميع السجلات؟'))state.socket?.emit('clear_logs');});
  const backdrop=$('panelBackdrop');
  if(backdrop)backdrop.addEventListener('click',()=>{document.querySelector('.users-panel')?.classList.remove('open');document.querySelector('.rooms-panel')?.classList.remove('open');backdrop.classList.remove('show');});
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
