/* سهر الليالي v6 — Complete Client */
const CONFIG = {
  API_URL:    window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com',
  SOCKET_URL: window.BACKEND_URL || 'https://sahar-backend-jxt8.onrender.com'
};

// ── State ──────────────────────────────────────
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
  roomSettings:{
    freeMic:true, requireHand:false, maxMicTime:0, maxSpeakers:1, guestMic:false,
    camAllow:true, camRequireApproval:true, whoCan:'all', maxCams:5,
    welcomeMsg:'مرحباً %NAME% في سهر الليالي', noAvatars:false, noURLs:false
  },
  myMuteStatus:null, // {text,voice,pm,cam,expiresAt}
  imageAllowed:false, // set by Basil permission
  notifications:0
};

// ── Constants ──────────────────────────────────
const BASIL = 'amer';
const isBasil = () => state.user?.username === BASIL && state.user?.role === 'admin';
const isAdmin = () => ['admin','moderator'].includes(state.user?.role);

const AVATARS = ['🌙','⭐','🌟','💫','🌸','🌺','🦋','🐉','🦁','🐺','🦊','🐻','🦅','🌊','🔥','⚡','🎭','🎨','🎵','🏆','👑','💎','🌈','🎯','🚀','🌴','🏰','⚔️','🛡️','🎤','📷','🌹','🍵','☕','🌿','🦄','🐬','🦋','🌻','🍀'];
const ROOM_ICONS = ['💬','🌙','⭐','🎵','🎮','📚','🌹','🏆','🎭','🌊','🔥','💎','🕌','🎨','🌿','🤝','🎤','📷','🌺','🏄','☕','🍵','🏠','🌃','🎪','🧩','🌐','🔮'];

// All emojis from screenshots
const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
  '😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
  '🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷',
  '🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥸','😎','🤓','🧐','😕',
  '😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
  '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩',
  '🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
  '🙈','🙉','🙊','🐵','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
  '🐷','🐸','🐙','🦄','🐴','🦋','🐝','🐛','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢',
  '🐍','🦎','🦖','🦕','🐊','🦏','🦛','🦍','🦧','🦣','🐘','🦒','🦓','🦬','🐃','🐂',
  '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
  '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️',
  '💪','🦾','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
  '💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉',
  '🌹','🌷','🌸','💐','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌙','⭐','🌟','💫',
  '✨','🌈','☀️','⛅','🌤️','🌦️','🌧️','⛈️','🌩️','❄️','⛄','🌊','💧','🔥','💥','🌀',
  '🎉','🎊','🎈','🎀','🎁','🎗️','🎟️','🎫','🏆','🥇','🥈','🥉','🏅','🎖️','🎪','🤹',
  '🎭','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🎸','🎹','🎺','🎻','🥁','🎲','🎯',
  '🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒',
  '🕌','🕍','⛪','🕋','⛩️','🗼','🗽','🗿','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️',
  '🍕','🍔','🍟','🌭','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🍲','🍛','🍜','🍝','🍠',
  '🍣','🍱','🥟','🦪','🍤','🍙','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬',
  '☕','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🥄','🍴',
  '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥊','🎽','🏋️','🤺',
  '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵',
  '💻','🖥️','🖨️','⌨️','🖱️','🖲️','💾','💿','📀','📷','📸','📹','🎥','📽️','🎞️','📞',
  '📱','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⌚','⏰','📡','🔋','🔌',
  '💡','🔦','🕯️','🪔','🧲','🔮','💎','🔑','🗝️','🔐','🔒','🔓','🔨','⛏️','🔧','🔩',
  '🎩','👑','💍','💄','👓','🕶️','🥽','🌂','☂️','🧵','🪡','🧶','👗','👘','🥻','🩱',
  '🌍','🌎','🌏','🗺️','🧭','🏔️','🌐','🗾','🧱','🛤️','🛣️','🏗️','🌁','🌃','🏙️','🌄',
];

const PALETTE = ['#000000','#800000','#008000','#000080','#800080','#008080','#c00000','#00c000','#0000c0','#c000c0','#00c0c0','#c0c000','#ff0000','#00ff00','#0000ff','#ff00ff','#00ffff','#ffff00','#ff8000','#8000ff','#0080ff','#ff0080','#80ff00','#00ff80','#ff8080','#80ff80','#8080ff','#ff80ff','#80ffff','#ffff80','#804000','#408000','#004080','#400080','#800040','#408080','#ffffff','#c0c0c0','#808080','#404040'];
const ROLES = {admin:4,moderator:3,vip:2,user:1,guest:0};
const ROLE_LBL = {admin:'👑 مدير',moderator:'🛡️ مشرف',vip:'💎 VIP',user:'عضو',guest:'👤 زائر'};
const ROLE_COLORS = {admin:'#cc0000',moderator:'#8b4513',vip:'#7700cc',user:'#000080',guest:'#555577'};
const PERMS_LIST = [
  {key:'blockMachine',label:'حظر الأجهزة'},
  {key:'muteUsers',label:'كتم المستخدمين'},
  {key:'kickout',label:'طرد'},
  {key:'sortMicList',label:'ترتيب قائمة الميك'},
  {key:'clearText',label:'مسح النص'},
  {key:'broadcast',label:'بث رسالة'},
  {key:'unban',label:'رفع الحظر'},
  {key:'viewLog',label:'عرض السجل'},
  {key:'manageAccounts',label:'إدارة الحسابات'},
  {key:'manageMembers',label:'إدارة الأعضاء'},
  {key:'manageAdmins',label:'إدارة المشرفين'},
  {key:'roomSettings',label:'إعدادات الغرفة'},
  {key:'adminReports',label:'تقارير الإدارة'},
  {key:'sendImages',label:'إرسال الصور'},
];

const $ = id => document.getElementById(id);
const el = (tag,cls,html) => {const e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e;};

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  state.deviceFp = await fingerprint();
  buildAll();
  bindLogin(); bindChat();
  // Load saved device settings
  const ds = localStorage.getItem('sahar_devices');
  if (ds) state.deviceSettings = JSON.parse(ds);
  // Load saved text color
  const sc = localStorage.getItem('sahar_textcolor');
  if (sc) { state.textColor = sc; $('colorDot').style.background = sc; $('msgInput').style.color = sc; }
  const tok = localStorage.getItem('sahar_token');
  const usr = localStorage.getItem('sahar_user');
  if (tok && usr) { state.token = tok; state.user = JSON.parse(usr); enterChat(); }
});

async function fingerprint() {
  const d = [navigator.userAgent,navigator.language,screen.width,screen.height,navigator.hardwareConcurrency||0].join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(d));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
}

// ── Builders ───────────────────────────────────
function buildAll() {
  ['avatarGrid','profileAvatarGrid'].forEach(id => {
    const g=$(id); if(!g) return;
    AVATARS.forEach(a => {
      const d=el('div','av-opt',a);
      if(a===state.selectedAvatar) d.classList.add('selected');
      d.addEventListener('click',()=>{g.querySelectorAll('.av-opt').forEach(o=>o.classList.remove('selected'));d.classList.add('selected');state.selectedAvatar=a;if(id==='profileAvatarGrid')$('profAvatarBig').textContent=a;});
      g.appendChild(d);
    });
  });
  const ig=$('roomIconGrid'); if(ig) ROOM_ICONS.forEach(i=>{const d=el('div','ri-opt',i);if(i===state.selectedRoomIcon)d.classList.add('selected');d.addEventListener('click',()=>{ig.querySelectorAll('.ri-opt').forEach(o=>o.classList.remove('selected'));d.classList.add('selected');state.selectedRoomIcon=i;});ig.appendChild(d);});
  const ep=$('emojiPicker'); EMOJIS.forEach(e=>{const d=el('span','emoji-item',e);d.addEventListener('click',()=>{insertAt($('msgInput'),e);$('emojiPicker').style.display='none';});ep.appendChild(d);});
  const cg=$('colorGrid'); PALETTE.forEach(c=>{const s=el('div','c-swatch');s.style.background=c;s.title=c;s.addEventListener('click',()=>{applyColor(c);$('colorPanel').style.display='none';});cg.appendChild(s);});
  // Permissions checkboxes for add account
  const npg=$('newAccPermsGrid');
  if(npg) PERMS_LIST.forEach(p=>{const l=el('label','chk-row');l.innerHTML=`<input type="checkbox" id="nacp_${p.key}"> <span>${p.label}</span>`;npg.appendChild(l);});
}

function applyColor(c) {
  state.textColor=c;
  $('colorDot').style.background=c;
  $('msgInput').style.color=c;
  localStorage.setItem('sahar_textcolor',c); // persist
}
function insertAt(el,txt){const s=el.selectionStart,e2=el.selectionEnd;el.value=el.value.slice(0,s)+txt+el.value.slice(e2);el.selectionStart=el.selectionEnd=s+txt.length;el.focus();autoResize(el);}

// ── Auth ───────────────────────────────────────
function bindLogin(){
  document.querySelectorAll('.ltab').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.ltab').forEach(b=>b.classList.remove('active'));document.querySelectorAll('.ltab-content').forEach(c=>c.classList.remove('active'));btn.classList.add('active');$(`${btn.dataset.tab}Tab`).classList.add('active');$('loginError').textContent='';});});
  $('loginBtn').addEventListener('click',doLogin);
  $('registerBtn').addEventListener('click',doRegister);
  $('guestBtn').addEventListener('click',doGuest);
  [$('loginUser'),$('loginPass')].forEach(i=>i?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();}));
}
async function doLogin(){
  const u=$('loginUser').value.trim(),p=$('loginPass').value;
  if(!u||!p){$('loginError').textContent='أدخل البيانات';return;}
  setLL(true);
  try{const r=await api('/auth/login','POST',{username:u,password:p,fingerprint:state.deviceFp});save(r.token,r.user);enterChat();}
  catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}
}
async function doRegister(){
  const u=$('regUser').value.trim(),n=$('regNick').value.trim(),p=$('regPass').value;
  if(!u||!n||!p){$('loginError').textContent='جميع الحقول مطلوبة';return;}
  setLL(true);
  try{const r=await api('/auth/register','POST',{username:u,nickname:n,password:p,avatar:state.selectedAvatar,fingerprint:state.deviceFp});save(r.token,r.user);enterChat();}
  catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}
}
async function doGuest(){
  setLL(true);
  try{const r=await api('/auth/guest','POST',{fingerprint:state.deviceFp});save(r.token,r.user);enterChat();}
  catch(e){$('loginError').textContent=e.message;}finally{setLL(false);}
}
function setLL(on){[$('loginBtn'),$('registerBtn'),$('guestBtn')].forEach(b=>{if(b)b.disabled=on;});}
function save(t,u){state.token=t;state.user=u;localStorage.setItem('sahar_token',t);localStorage.setItem('sahar_user',JSON.stringify(u));}

// ── Enter Chat ─────────────────────────────────
async function enterChat(){
  $('loginScreen').classList.remove('active');
  $('chatScreen').classList.add('active');
  $('myAvatarEl').textContent=state.user.avatar||'🌙';
  $('myNickEl').textContent=state.user.nickname;
  // Apply saved text color from profile
  if(state.user.text_color){applyColor(state.user.text_color);}
  // Apply saved color from localStorage
  const sc=localStorage.getItem('sahar_textcolor');
  if(sc){applyColor(sc);}
  // Set profile color input
  if($('profColorInput'))$('profColorInput').value=state.textColor;
  updateAdminUI();
  await loadRooms();
  connectSocket();
  // Add basil spy button
  if(isBasil()){
    const spyBtn=el('button','tb-btn','<span style="font-size:17px">👁</span><span>تجسس</span>');
    spyBtn.style.background='linear-gradient(to bottom,#8040c0,#6020a0)';
    spyBtn.addEventListener('click',openSpyPanel);
    document.querySelector('.tb-group')?.parentElement?.appendChild(spyBtn);
    if($('navAllUsersRm')) $('navAllUsersRm')?.style && ($('navAllUsersRm').style.display='');
    document.querySelectorAll('.basil-only').forEach(e=>e.style.display='');
  }
}

function updateAdminUI(){
  const adm=isAdmin();
  document.querySelectorAll('.admin-only').forEach(e=>e.style.display=adm?'':'none');
  if($('addRoomBtn'))   $('addRoomBtn').style.display   =adm?'flex':'none';
  if($('clearChatBtn')) $('clearChatBtn').style.display =adm?'flex':'none';
  if($('roomManageBtn'))$('roomManageBtn').style.display=adm?'flex':'none';
  if($('editRulesBtn')) $('editRulesBtn').style.display =adm?'':'none';
  if($('imageBtn'))     $('imageBtn').style.display     =(state.imageAllowed||isBasil())?'flex':'none';
}

// ── Rooms ──────────────────────────────────────
async function loadRooms(){try{state.rooms=await api('/rooms');renderRooms();}catch(e){console.error(e);}}
function renderRooms(){
  const list=$('roomsList');list.innerHTML='';
  state.rooms.forEach(room=>{
    const li=el('li','room-item');
    if(state.currentRoom?.id===room.id)li.classList.add('active');
    const locked=room._locked||false;
    li.innerHTML=`<span class="ri-icon">${room.icon}</span><div class="ri-info"><div class="ri-name">${room.name}</div><div class="ri-count" id="rc_${room.id}"></div></div>${locked?'<span class="ri-lock">🔒</span>':''}${isAdmin()?`<button class="ri-edit" data-id="${room.id}">✏</button>`:''}`;
    li.querySelector('.ri-name')?.addEventListener('click',()=>tryJoinRoom(room));
    li.querySelector('.ri-icon')?.addEventListener('click',()=>tryJoinRoom(room));
    li.querySelector('.ri-edit')?.addEventListener('click',e=>{e.stopPropagation();openEditRoom(room);});
    list.appendChild(li);
  });
}

function tryJoinRoom(room,password=''){
  // socket will tell us if locked
  state.pendingRoomJoin=room;
  joinRoom(room,false,password);
}

function joinRoom(room,undercover=false,password=''){
  state.currentRoom=room;
  $('menuRoomIcon').textContent=room.icon;
  $('menuRoomName').textContent=room.name;
  $('roomTabIcon').textContent=room.icon;
  $('roomTabName').textContent=room.name;
  document.querySelectorAll('.room-item').forEach(i=>i.classList.toggle('active',i.querySelector('.ri-name')?.textContent===room.name));
  $('messagesArea').innerHTML='';
  cancelReply();
  const welcome=state.roomSettings.welcomeMsg.replace('%NAME%',state.user.nickname);
  $('welcomeText').textContent=welcome;
  $('welcomeBanner').style.display='block';
  state.socket?.emit('join_room',{roomId:room.id,undercover:undercover||state.undercover,password,roomSettings:state.roomSettings});
}

// ── Socket ─────────────────────────────────────
function connectSocket(){
  setConn('connecting');
  state.socket=io(CONFIG.SOCKET_URL,{
    auth:{token:state.token,fingerprint:state.deviceFp,undercover:state.undercover},
    transports:['websocket','polling'],reconnection:true,reconnectionAttempts:10,reconnectionDelay:2000
  });
  const s=state.socket;
  s.on('connect',()=>{setConn('connected');if(state.currentRoom)s.emit('join_room',{roomId:state.currentRoom.id,undercover:state.undercover,password:'',roomSettings:state.roomSettings});});
  s.on('disconnect',()=>setConn('disconnected'));
  s.on('connect_error',()=>setConn('disconnected'));

  // Room locked — ask for password
  s.on('room_locked',({roomId,message})=>{
    $('roomPassError').textContent='';
    $('roomPassEntryInput').value='';
    $('roomPassEntryModal').style.display='flex';
    $('submitRoomPassBtn').onclick=()=>{
      const pw=$('roomPassEntryInput').value;
      if(!pw){$('roomPassError').textContent='أدخل كلمة المرور';return;}
      $('roomPassEntryModal').style.display='none';
      joinRoom(state.pendingRoomJoin,state.undercover,pw);
    };
  });

  s.on('room_lock_status',({roomId,locked})=>{
    const room=state.rooms.find(r=>r.id===roomId);
    if(room){room._locked=locked;}
    $('roomLockIcon').style.display=locked&&state.currentRoom?.id===roomId?'':'none';
    renderRooms();
  });

  s.on('room_history',({roomId,messages})=>{
    if(roomId!==state.currentRoom?.id)return;
    $('messagesArea').innerHTML='';
    messages.forEach(m=>renderMsg(m));
    scrollBot(true);
  });

  s.on('new_message',msg=>{if(msg.roomId!==state.currentRoom?.id)return;renderMsg(msg);scrollBot();});
  s.on('user_joined',({nickname,avatar,roomId})=>{if(roomId!==state.currentRoom?.id)return;renderJoin(nickname,avatar,true);});
  s.on('user_left',({nickname,roomId})=>{if(roomId!==state.currentRoom?.id)return;renderJoin(nickname,'',false);});

  s.on('room_users',({roomId,users})=>{
    if(roomId!==state.currentRoom?.id)return;
    state.onlineUsers=users;renderUsers();
    $('onlineCount').textContent=users.length;
    $('menuOnlineCount').textContent=users.length+' متصل';
  });

  s.on('user_typing',({userId,nickname})=>{if(userId===state.user.id)return;$('typingText').textContent=nickname+' يكتب...';$('typingRow').style.display='flex';});
  s.on('user_stopped_typing',()=>$('typingRow').style.display='none');
  s.on('reaction_added',({messageId,emoji})=>{
    const line=document.querySelector(`[data-mid="${messageId}"]`);if(!line)return;
    let row=line.nextElementSibling?.classList?.contains('reactions-row')?line.nextElementSibling:null;
    if(!row){row=el('div','reactions-row');line.after(row);}
    let ex=[...row.children].find(c=>c.dataset.e===emoji);
    if(ex){ex.dataset.c=parseInt(ex.dataset.c||1)+1;ex.textContent=emoji+ex.dataset.c;}
    else{const r=el('span','react-pill',emoji+'1');r.dataset.e=emoji;r.dataset.c=1;row.appendChild(r);}
  });

  // Stage
  s.on('stage_update',({stageUsers})=>{state.stageUsers=stageUsers;renderStage();});
  s.on('hand_queue_update',({queue})=>renderHandQueue(queue));

  // Mic
  s.on('mic_granted',async({by})=>{
    toast('🎤 منحك '+by+' الميكروفون','success');
    const ok=await Voice.startSpeaking(s,state.currentRoom?.id,state.deviceSettings.micId||null);
    if(ok){state.micActive=true;$('talkBtn').classList.add('active');state.handRaised=false;$('handBtn').classList.remove('active');}
  });
  s.on('mic_revoked',()=>{toast('🎤 تم سحب الميكروفون','info');Voice.stopSpeaking(s);state.micActive=false;$('talkBtn').classList.remove('active');});
  s.on('speaker_joined',({speakerSocketId,nickname,avatar})=>Voice.onSpeakerJoined(s,speakerSocketId,nickname,avatar));
  s.on('speaker_left',  ({speakerSocketId})=>Voice.onSpeakerLeft(speakerSocketId));
  s.on('new_listener',  ({listenerSocketId})=>Voice.onNewListener(s,listenerSocketId));
  s.on('webrtc_offer',  ({from,offer})=>Voice.onOffer(s,from,offer));
  s.on('webrtc_answer', ({from,answer})=>Voice.onAnswer(from,answer));
  s.on('webrtc_ice',    ({from,candidate})=>Voice.onIce(from,candidate));

  // Cam
  s.on('cam_available',({socketId,nickname,avatar})=>{
    if(!isBasil()) addCamThumb(socketId,nickname,avatar,true); // show request button
  });
  s.on('cam_gone',({socketId})=>removeCamThumb(socketId));
  s.on('existing_cams',({cams})=>{cams.forEach(c=>addCamThumb(c.socketId,c.nickname,c.avatar,!isBasil()));});
  s.on('cam_request',({fromNick,fromSocketId,fromAvatar})=>{
    showCamRequestPopup(fromNick,fromSocketId,fromAvatar);
    addNotifCount();
  });
  s.on('cam_rejected_notification',({by})=>toast(by+' رفض طلب الكاميرا','info'));
  s.on('force_cam_off',()=>{
    if(state.localStream){state.localStream.getTracks().forEach(t=>t.stop());state.localStream=null;}
    state.camActive=false;$('camBtn').classList.remove('active');
    $('camStrip').innerHTML='';$('camStrip').style.display='none';
    toast('📷 تم إيقاف كاميرتك بواسطة المشرف','error');
  });
  // Basil silent cam
  s.on('basil_cam_auto',({socketId,nickname,avatar})=>{
    // Basil can view silently via WebRTC
    addSpyCamThumb(socketId,nickname,avatar);
  });
  s.on('basil_cam_connect',({basilSocketId})=>{
    // Someone (Basil) wants to connect — start WebRTC offer to them
    startCamWebRTCTo(basilSocketId);
  });

  // Mute notifications
  s.on('muted_notification',({options,duration,reason,by,expiresAt})=>{
    state.myMuteStatus={...options,expiresAt};
    showMuteStatusBar(options,duration,expiresAt,reason,by);
  });
  s.on('muted_on_login',({options,duration,reason})=>{
    state.myMuteStatus=options;
    showMuteStatusBar(options,duration,null,reason,'النظام');
  });
  s.on('unmuted_notification',({by})=>{
    state.myMuteStatus=null;
    $('muteStatusBar').style.display='none';
    toast('🔊 تم رفع الكتم بواسطة '+by,'success');
  });

  // PM + notifications
  s.on('private_message_received',msg=>{
    showPmNotif(msg);addNotifCount();
    if(state.pmTarget?.userId===msg.from_id)appendPmMsg(msg,false);
  });
  s.on('private_message_sent',msg=>appendPmMsg(msg,true));
  s.on('whisper_msg',msg=>renderWhisper(msg));

  // Basil spy
  if(isBasil()){
    s.on('basil_spy_message',({roomId,from,content,type,createdAt})=>appendSpyLog(type==='image'?`📨 [صورة] ${from} في غرفة`:(`📨 [غرفة] ${from}: ${content}`),createdAt));
    s.on('basil_spy_whisper',({from,to,content})=>appendSpyLog(`🔒 [همسة] ${from}→${to}: ${content}`,new Date()));
    s.on('basil_spy_pm',({from,to,content,createdAt})=>appendSpyLog(`💬 [خاص] ${from}→${to}: ${content}`,createdAt));
    s.on('basil_all_rooms',({rooms})=>{state.spyRooms=rooms;renderSpyRooms();});
    s.on('spy_room_history',({roomId,messages})=>{state.spyMessages[roomId]=messages;renderSpyHistory(roomId);});
    s.on('spy_pms_result',({messages})=>{state.spyPms=messages;renderSpyPms();});
    s.on('basil_logs_result',({roomLogs,adminLogs})=>{state.roomLogs=roomLogs;state.adminLogs=adminLogs;renderSpyLogs();renderManageLogs();});
    s.on('basil_online_all',({users})=>renderAllOnline(users));
    setTimeout(()=>s.emit('basil_get_all_rooms'),1200);
  }

  s.on('chat_cleared',()=>{$('messagesArea').innerHTML='';renderSys('تم مسح الدردشة');});
  s.on('kicked',({reason,by})=>{alert('تم طردك من قِبل '+by+'.\nالسبب: '+(reason||'غير محدد'));doLogout();});
  s.on('banned',({reason})=>{alert('تم حظرك.\nالسبب: '+(reason||'غير محدد'));doLogout();});
  s.on('toast_notification',({msg,type})=>toast(msg,type));
  s.on('error',({message})=>toast(message,'error'));
}

function setConn(st){$('menuConnDot').className='conn-dot '+st;}

// ── Message Rendering ──────────────────────────
function renderMsg(msg){
  $('chatWelcome')?.remove();
  if(msg.type==='system'){renderSys(msg.content);return;}
  const isOwn=(msg.userId||msg.user_id)===state.user.id;
  const role=msg.role||'user';
  const color=msg.textColor||msg.text_color||'#000000';
  const size=msg.fontSize||msg.font_size||14;
  const time=fmtTime(msg.createdAt||msg.created_at);
  const mid=msg.id;

  const line=el('div','msg-line');line.dataset.mid=mid;
  const ts=el('span','msg-ts','['+time+']');
  const av=el('span','msg-av',state.roomSettings.noAvatars?'👤':(msg.avatar||'🌙'));
  const nk=el('span','msg-nick role-'+role,msg.nickname);
  nk.dataset.userid=msg.userId||msg.user_id||'';
  nk.dataset.socketid=msg.socketId||'';
  nk.dataset.username=msg.username||'';
  nk.addEventListener('click',e=>showCtx(e,{socketId:msg.socketId,userId:msg.userId||msg.user_id,username:msg.username,nickname:msg.nickname,role,fingerprint:msg.fingerprint}));
  av.addEventListener('click',e=>showCtx(e,{socketId:msg.socketId,userId:msg.userId||msg.user_id,username:msg.username,nickname:msg.nickname,role}));

  const co=el('span','msg-colon',':');
  let content;
  if(msg.type==='image'){
    content=el('span','msg-text');
    const img=document.createElement('img');
    img.src=msg.content;img.className='msg-img';
    img.addEventListener('click',()=>{window.open(msg.content,'_blank');});
    content.appendChild(img);
  } else {
    content=el('span','msg-text',state.roomSettings.noURLs?msg.content.replace(/https?:\/\/\S+/g,'[رابط]'):msg.content);
    content.style.color=color;content.style.fontSize=size+'px';
    if(msg.bold)content.style.fontWeight='700';
    if(msg.italic)content.style.fontStyle='italic';
  }

  const acts=el('span','msg-actions');
  const addA=(i,t,fn)=>{const b=el('button','msg-act-btn',i);b.title=t;b.addEventListener('click',fn);acts.appendChild(b);};
  addA('↩','رد',()=>startReply(mid,msg.type==='image'?'[صورة]':msg.content,msg.nickname));
  addA('😊','تفاعل',e=>showReactPick(e,mid));
  if(isOwn||isAdmin())addA('✕','حذف',()=>delMsg(mid,line));

  if(msg.replyTo||msg.reply_to){const ref=el('span','reply-ref','↩');line.appendChild(ref);}
  line.append(acts,ts,av,nk,co,content);
  $('messagesArea').appendChild(line);
}

function renderJoin(nick,avatar,joined){
  $('chatWelcome')?.remove();
  const d=el('div',joined?'msg-join':'msg-leave');
  d.innerHTML=`<span>${joined?'→':'←'}</span><b>${nick}</b><span>${joined?' دخل الغرفة':' غادر الغرفة'}</span>`;
  $('messagesArea').appendChild(d);scrollBot();
}
function renderSys(text){$('chatWelcome')?.remove();$('messagesArea').appendChild(el('div','msg-sys',text));}
function renderWhisper(msg){
  $('chatWelcome')?.remove();
  const line=el('div','msg-line msg-whisper');
  line.append(el('span','msg-ts','['+fmtTime(msg.createdAt)+']'),el('span','msg-nick','🔒 '+msg.from+'→'+msg.to),el('span','msg-colon',':'),el('span','msg-text',msg.content));
  $('messagesArea').appendChild(line);scrollBot();
}
function scrollBot(force=false){const a=$('messagesArea');const near=a.scrollHeight-a.scrollTop-a.clientHeight<150;if(near||force)a.scrollTop=a.scrollHeight;}
function fmtTime(iso){if(!iso)return'';return new Date(iso).toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'});}

// ── User List ──────────────────────────────────
function renderUsers(){
  const list=$('userList');list.innerHTML='';
  const sorted=[...state.onlineUsers].sort((a,b)=>(ROLES[b.role]||0)-(ROLES[a.role]||0));
  sorted.forEach(u=>{
    const li=el('li','user-item');
    const onStage=state.stageUsers.some(s=>s.userId===u.userId);
    const muteIcons=u.isMuted?'<span title="مكتوم">🔇</span>':'';
    li.innerHTML=`<span class="u-av">${state.roomSettings.noAvatars?'👤':(u.avatar||'🌙')}</span><div class="u-info"><div class="u-nick role-${u.role||'user'}">${u.nickname}</div></div><div class="u-icons">${onStage?'<span>🎤</span>':''}${u.camActive?'<span>📷</span>':''}${muteIcons}</div><span class="u-status"></span>`;
    if(u.userId!==state.user.id) li.addEventListener('click',e=>{document.querySelectorAll('.user-item').forEach(i=>i.classList.remove('selected'));li.classList.add('selected');showCtx(e,u);});
    list.appendChild(li);
  });
}

// ── Stage ──────────────────────────────────────
function renderStage(){
  const slots=$('stageSlots');slots.innerHTML='';
  if(!state.stageUsers.length){slots.innerHTML='<div class="stage-empty">لا أحد</div>';return;}
  state.stageUsers.forEach(u=>{
    const d=el('div',`stage-user${u.speaking?' speaking':''}${u.muted?' muted':''}`);
    d.innerHTML=`${u.avatar||'🌙'} ${u.nickname} ${u.muted?'🔇':'🎤'}`;
    slots.appendChild(d);
  });
}
function renderHandQueue(queue){
  const sec=$('handSection'),list=$('handList');
  if(!queue.length){sec.style.display='none';return;}
  sec.style.display='block';list.innerHTML='';
  queue.forEach(u=>{
    const d=el('div','hand-item','✋ '+u.nickname);
    if(isAdmin()){const b=el('button','hand-approve','✓');b.addEventListener('click',()=>grantMic(u));d.appendChild(b);}
    list.appendChild(d);
  });
}

// ── Cam Thumbnails ─────────────────────────────
function addCamThumb(socketId,nickname,avatar,showReqBtn=false){
  const strip=$('camStrip');strip.style.display='flex';
  let th=strip.querySelector(`[data-csock="${socketId}"]`);
  if(!th){
    th=el('div','cam-thumb');th.dataset.csock=socketId;
    const v=document.createElement('video');v.autoplay=true;v.playsInline=true;
    const lb=el('div','cam-thumb-name',nickname);
    th.appendChild(v);th.appendChild(lb);
    if(showReqBtn){
      const rb=el('button','cam-req-btn','طلب');
      rb.addEventListener('click',e=>{e.stopPropagation();state.socket?.emit('request_cam',{toSocketId:socketId,toNickname:nickname});toast('تم إرسال طلب الكاميرا','info');});
      th.appendChild(rb);
    }
    th.addEventListener('click',()=>{$('camVideo').srcObject=v.srcObject;$('camModalTitle').textContent='📷 '+nickname;$('camModal').style.display='flex';});
    strip.appendChild(th);
  }
}
function removeCamThumb(socketId){
  const th=$('camStrip').querySelector(`[data-csock="${socketId}"]`);
  if(th)th.remove();
  if(!$('camStrip').children.length)$('camStrip').style.display='none';
}
function setThumbStream(socketId,stream){
  const v=$('camStrip').querySelector(`[data-csock="${socketId}"] video`);
  if(v)v.srcObject=stream;
}
function addSpyCamThumb(socketId,nickname,avatar){
  const grid=$('spyCamGrid');if(!grid)return;
  let wrap=grid.querySelector(`[data-spysock="${socketId}"]`);
  if(!wrap){
    wrap=el('div');wrap.dataset.spysock=socketId;
    const v=document.createElement('video');v.autoplay=true;v.playsInline=true;v.style.cssText='width:160px;height:120px;border-radius:4px;background:#000;border:1px solid #400080;object-fit:cover';
    const lb=el('div','spy-cam-label',nickname);
    wrap.appendChild(v);wrap.appendChild(lb);
    grid.appendChild(wrap);
    // Start WebRTC to get the stream
    state.socket?.emit('request_cam',{toSocketId:socketId,toNickname:nickname});
  }
}

async function startCamWebRTCTo(toSocketId){
  if(!state.localStream)return;
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  state.localStream.getTracks().forEach(t=>pc.addTrack(t,state.localStream));
  pc.onicecandidate=e=>{if(e.candidate)state.socket?.emit('webrtc_ice',{to:toSocketId,candidate:e.candidate});};
  const offer=await pc.createOffer();
  await pc.setLocalDescription(offer);
  state.socket?.emit('webrtc_offer',{to:toSocketId,offer});
}

// ── Context Menu ───────────────────────────────
function showCtx(e,target){
  e.preventDefault();e.stopPropagation();
  const menu=$('ctxMenu'),list=$('ctxList');list.innerHTML='';
  const myRole=ROLES[state.user.role]||0;
  const targetRole=ROLES[target.role]||0;
  const adm=isAdmin();
  const add=(icon,lbl,fn,cls='')=>{const li=el('li',cls,icon+' '+lbl);if(fn)li.addEventListener('click',()=>{fn();hideCtx();}); else li.className='ctx-hdr';list.appendChild(li);};
  const sep=()=>list.appendChild(el('li','ctx-sep'));
  add('',target.nickname,null,'ctx-hdr');
  add('💬','رسالة خاصة',()=>openPm(target));
  if(target.socketId)add('🔒','همسة',()=>doWhisper(target));
  add('ℹ','معلومات المستخدم',()=>showUserInfo(target));
  if(adm&&target.userId!==state.user.id){
    sep();
    const onStage=state.stageUsers.some(s=>s.userId===target.userId);
    if(onStage)add('🎤','سحب الميكروفون',()=>state.socket?.emit('revoke_mic',{toSocketId:target.socketId}));
    else add('🎤','منح الميكروفون',()=>grantMic(target));
    add('🔇','كتم',()=>openMuteDialog(target));
    if(target.isMuted)add('🔊','رفع الكتم',()=>state.socket?.emit('unmute_user',{targetSocketId:target.socketId}));
    add('📷','إيقاف الكاميرا',()=>state.socket?.emit('force_cam_off_target',{targetSocketId:target.socketId}));
    sep();
    if(target.socketId)add('🥾','طرد',()=>kickUser(target),'ctx-danger');
    if(myRole>targetRole){
      add('🚫','حظر',()=>banUser(target),'ctx-danger');
      add('👑','تغيير الرتبة',()=>changeRole(target));
      add('🔑','الصلاحيات',()=>openPermDialog(target));
      if(isBasil())add('🖼','السماح بالصور',()=>grantImagePerm(target));
    }
  }
  if(isBasil()&&target.userId!==state.user.id){sep();add('👁','تتبع في التجسس',()=>toast('سيظهر في لوحة التجسس','info'));}
  const x=Math.min(e.clientX,window.innerWidth-185);
  const y=Math.min(e.clientY,window.innerHeight-320);
  menu.style.top=y+'px';menu.style.left=x+'px';menu.style.display='block';
  setTimeout(()=>document.addEventListener('click',hideCtx,{once:true}),0);
}
function hideCtx(){$('ctxMenu').style.display='none';}

async function showUserInfo(target){
  try{
    const u=await api('/users/'+(target.username||'unknown'));
    $('userInfoBody').innerHTML=`
      <div style="text-align:center;font-size:44px;margin-bottom:10px">${u.avatar||'🌙'}</div>
      <div class="uinfo-row"><span class="uinfo-label">الاسم المستعار:</span><b>${u.nickname}</b></div>
      <div class="uinfo-row"><span class="uinfo-label">اسم المستخدم:</span>${u.username}</div>
      <div class="uinfo-row"><span class="uinfo-label">الرتبة:</span><span style="color:${ROLE_COLORS[u.role]||'#000'};font-weight:700">${ROLE_LBL[u.role]||u.role}</span></div>
      <div class="uinfo-row"><span class="uinfo-label">الحالة:</span>${u.status||'غير معروف'}</div>
      <div class="uinfo-row"><span class="uinfo-label">عنوان IP:</span><span dir="ltr">${u.last_ip||target.ip||'غير متوفر'}</span></div>
      <div class="uinfo-row"><span class="uinfo-label">الدولة:</span>${u.country||target.country||'غير معروفة'}</div>
      <div class="uinfo-row"><span class="uinfo-label">الجهاز:</span><span dir="ltr" style="font-size:10px">${(u.fingerprint||target.fingerprint||'-').slice(0,20)}...</span></div>
      <div class="uinfo-row"><span class="uinfo-label">آخر ظهور:</span>${u.last_seen?new Date(u.last_seen).toLocaleString('ar'):'-'}</div>
      <div class="uinfo-row"><span class="uinfo-label">نبذة:</span>${u.bio||'-'}</div>
    `;
    $('userInfoModal').style.display='flex';
  }catch(e){toast('خطأ في تحميل المعلومات','error');}
}

function doWhisper(target){const msg=prompt('همسة إلى '+target.nickname+':');if(msg?.trim())state.socket?.emit('whisper',{toSocketId:target.socketId,toNickname:target.nickname,content:msg.trim()});}
async function kickUser(target){const r=prompt('سبب الطرد:')||'';state.socket?.emit('kick_user',{targetSocketId:target.socketId,reason:r});}
async function banUser(target){
  const r=prompt('سبب الحظر:')||'';
  const d=prompt('المدة بالساعات (فارغ=دائم):');
  const duration=d?parseInt(d):null;
  try{await api('/admin/ban/'+target.userId,'POST',{reason:r,duration,fingerprint:target.fingerprint,ip:target.ip});state.socket?.emit('force_ban',{targetSocketId:target.socketId,reason:r});toast('تم حظر '+target.nickname,'success');}
  catch(e){toast(e.message,'error');}
}
async function changeRole(target){
  const role=prompt('الرتبة:\n(user / vip / moderator / admin)');
  if(!['user','vip','moderator','admin'].includes(role))return;
  try{await api('/admin/role/'+target.userId,'PATCH',{role});toast('تم تغيير الرتبة','success');}
  catch(e){toast(e.message,'error');}
}
function grantMic(target){state.socket?.emit('grant_mic',{toSocketId:target.socketId,toNickname:target.nickname});}
async function grantImagePerm(target){
  try{
    const perms={...((target.permissions&&typeof target.permissions==='object')?target.permissions:{}),sendImages:true};
    await api('/admin/permissions/'+target.userId,'PATCH',{permissions:perms});
    toast('تم منح '+target.nickname+' إذن إرسال الصور','success');
  }catch(e){toast(e.message,'error');}
}

// ── Mute Dialog ────────────────────────────────
function openMuteDialog(target){
  state.muteTarget=target;
  $('muteUserAvatar').textContent=target.avatar||'👤';
  $('muteUserName').textContent=target.nickname;
  $('muteText').checked=true;$('muteVoice').checked=true;
  $('mutePm').checked=false;$('muteCam').checked=false;
  $('muteReason').value='';
  $('muteModal').style.display='flex';
}
function doMute(){
  if(!state.muteTarget)return;
  const options={text:$('muteText').checked,voice:$('muteVoice').checked,pm:$('mutePm').checked,cam:$('muteCam').checked};
  const durVal=$('muteDuration').value;
  const duration=durVal==='0'?null:parseInt(durVal);
  const reason=$('muteReason').value;
  state.socket?.emit('mute_user_advanced',{targetSocketId:state.muteTarget.socketId,options,duration,reason});
  $('muteModal').style.display='none';state.muteTarget=null;
  toast('تم الكتم','success');
}

// ── Mute Status Bar ────────────────────────────
function showMuteStatusBar(options,duration,expiresAt,reason,by){
  const bar=$('muteStatusBar');
  const types=[options.text?'📝 نص':'',options.voice?'🎤 صوت':'',options.pm?'💬 خاص':'',options.cam?'📷 كاميرا':''].filter(Boolean).join(' | ');
  let timeStr='دائم';
  if(expiresAt){
    const rem=Math.round((new Date(expiresAt)-new Date())/60000);
    timeStr=rem>0?rem+' دقيقة متبقية':'انتهت المدة';
  } else if(duration){timeStr=duration+' دقيقة';}
  bar.innerHTML=`🔇 أنت مكتوم من: ${types} | المدة: ${timeStr} | بواسطة: ${by}${reason?' | السبب: '+reason:''}`;
  bar.style.display='block';
  // Countdown timer
  if(expiresAt){
    const iv=setInterval(()=>{
      const rem=Math.round((new Date(expiresAt)-new Date())/60000);
      if(rem<=0){bar.style.display='none';state.myMuteStatus=null;clearInterval(iv);return;}
      bar.innerHTML=`🔇 أنت مكتوم من: ${types} | ${rem} دقيقة متبقية | بواسطة: ${by}`;
    },30000);
  }
}

// ── Permissions Dialog ─────────────────────────
function openPermDialog(target){
  state.permTarget=target;
  $('permUserName').textContent=target.nickname;
  const container=$('permCheckboxes');container.innerHTML='';
  const existing=target.permissions&&typeof target.permissions==='object'?target.permissions:{};
  PERMS_LIST.forEach(p=>{
    const lbl=el('label','chk-row');
    lbl.innerHTML=`<input type="checkbox" id="perm_${p.key}" ${existing[p.key]?'checked':''}> <span>${p.label}</span>`;
    container.appendChild(lbl);
  });
  $('permModal').style.display='flex';
}
async function savePermissions(){
  if(!state.permTarget)return;
  const perms={};
  PERMS_LIST.forEach(p=>{perms[p.key]=$('perm_'+p.key)?.checked||false;});
  try{
    await api('/admin/permissions/'+state.permTarget.userId,'PATCH',{permissions:perms});
    state.socket?.emit('set_permissions',{targetUserId:state.permTarget.userId,permissions:perms});
    $('permModal').style.display='none';
    toast('تم حفظ الصلاحيات ✓','success');
    // Update image permission
    if(perms.sendImages&&state.pmTarget?.userId===state.permTarget.userId){state.imageAllowed=true;$('imageBtn').style.display='flex';}
  }catch(e){toast(e.message,'error');}
}

// ── Cam Popups ─────────────────────────────────
function showCamRequestPopup(fromNick,fromSocketId,fromAvatar){
  const popup=el('div','notif-popup');
  popup.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:28px">${fromAvatar||'👤'}</span>
      <div><div class="notif-from">${fromNick}</div><div class="notif-text">يطلب مشاهدة كاميرتك</div></div>
    </div>
    <div class="notif-actions">
      <button class="notif-btn notif-btn-green" id="ca_${fromSocketId}">قبول</button>
      <button class="notif-btn notif-btn-red"   id="cr_${fromSocketId}">رفض</button>
      <button class="notif-btn notif-btn-gray"  id="ci_${fromSocketId}">تجاهل</button>
    </div>`;
  popup.querySelector(`#ca_${fromSocketId}`)?.addEventListener('click',()=>{state.socket?.emit('cam_approved',{toSocketId:fromSocketId});popup.remove();});
  popup.querySelector(`#cr_${fromSocketId}`)?.addEventListener('click',()=>{state.socket?.emit('cam_rejected',{toSocketId:fromSocketId});popup.remove();});
  popup.querySelector(`#ci_${fromSocketId}`)?.addEventListener('click',()=>popup.remove());
  $('notifContainer').appendChild(popup);
  setTimeout(()=>popup?.remove(),15000);
}

function showPmNotif(msg){
  const popup=el('div','notif-popup');
  popup.innerHTML=`<div class="notif-from">💬 ${msg.from_nickname}</div><div class="notif-text">${msg.content.slice(0,60)}</div><div class="notif-actions"><button class="notif-btn notif-btn-green" id="pmreply_${msg.from_id}">رد</button></div>`;
  popup.querySelector(`#pmreply_${msg.from_id}`)?.addEventListener('click',()=>{openPm({userId:msg.from_id,nickname:msg.from_nickname,username:msg.from_username});popup.remove();});
  $('notifContainer').appendChild(popup);
  setTimeout(()=>popup?.remove(),8000);
}

function addNotifCount(){
  state.notifications++;
  $('notifCount').textContent=state.notifications;
  $('notifCount').style.display='';
}

// ── Voice ──────────────────────────────────────
async function toggleTalk(){
  if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}
  if(state.myMuteStatus?.voice){toast('🔇 أنت مكتوم صوتياً','error');return;}
  if(state.micActive){
    Voice.stopSpeaking(state.socket);state.micActive=false;$('talkBtn').classList.remove('active');toast('🎤 تم إيقاف الميكروفون','info');
  } else {
    if(state.roomSettings.freeMic&&!state.roomSettings.requireHand){
      const ok=await Voice.startSpeaking(state.socket,state.currentRoom.id,state.deviceSettings.micId||null);
      if(ok){state.micActive=true;$('talkBtn').classList.add('active');}
    } else {
      if(state.handRaised){state.socket?.emit('lower_hand');state.handRaised=false;$('handBtn').classList.remove('active');toast('✋ تم إنزال يدك','info');}
      else{state.socket?.emit('raise_hand');state.handRaised=true;$('handBtn').classList.add('active');toast('✋ تم رفع يدك','info');}
    }
  }
}

async function toggleCam(){
  if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}
  if(!state.roomSettings.camAllow){toast('الكاميرا غير مسموح بها في هذه الغرفة','error');return;}
  if(state.myMuteStatus?.cam){toast('🔇 أنت ممنوع من الكاميرا','error');return;}
  const role=state.user.role;
  if(state.roomSettings.whoCan==='members'&&role==='guest'){toast('الزوار لا يمكنهم فتح الكاميرا','error');return;}
  if(state.roomSettings.whoCan==='mods'&&!['admin','moderator'].includes(role)){toast('المشرفون فقط يمكنهم فتح الكاميرا','error');return;}
  if(state.camActive){
    state.localStream?.getTracks().forEach(t=>t.stop());state.localStream=null;state.camActive=false;
    $('camBtn').classList.remove('active');state.socket?.emit('cam_off');
    $('camStrip').innerHTML='';$('camStrip').style.display='none';toast('📷 تم إيقاف الكاميرا','info');
  } else {
    try{
      const constraints={video:state.deviceSettings.camId?{deviceId:{exact:state.deviceSettings.camId}}:true,audio:state.micActive};
      state.localStream=await navigator.mediaDevices.getUserMedia(constraints);
      state.camActive=true;$('camBtn').classList.add('active');
      state.socket?.emit('cam_on',{roomId:state.currentRoom.id,roomSettings:state.roomSettings});
      // Show local cam
      const strip=$('camStrip');strip.style.display='flex';
      let th=strip.querySelector('#myLocalCam');
      if(!th){th=el('div','cam-thumb');th.id='myLocalCam';const v=document.createElement('video');v.autoplay=true;v.muted=true;v.playsInline=true;const lb=el('div','cam-thumb-name',state.user.nickname);th.appendChild(v);th.appendChild(lb);th.addEventListener('click',()=>{$('camVideo').srcObject=state.localStream;$('camModalTitle').textContent='📷 '+state.user.nickname;$('camModal').style.display='flex';});strip.insertBefore(th,strip.firstChild);}
      th.querySelector('video').srcObject=state.localStream;
      toast('📷 الكاميرا مفعّلة','success');
    }catch(e){toast('❌ لا يمكن الوصول للكاميرا — تحقق من الإعدادات','error');}
  }
}

// ── Device Settings ────────────────────────────
async function openDeviceSettings(){
  $('deviceModal').style.display='flex';
  $('deviceMsg').textContent='';
  try{
    const devs=await navigator.mediaDevices.enumerateDevices();
    const mics=devs.filter(d=>d.kind==='audioinput');
    const speakers=devs.filter(d=>d.kind==='audiooutput');
    const cams=devs.filter(d=>d.kind==='videoinput');
    const fill=(sel,arr,saved)=>{sel.innerHTML='<option value="">افتراضي</option>';arr.forEach(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'جهاز '+d.deviceId.slice(0,8);if(d.deviceId===saved)o.selected=true;sel.appendChild(o);});};
    fill($('micSelect'),mics,state.deviceSettings.micId);
    fill($('speakerSelect'),speakers,state.deviceSettings.speakerId);
    fill($('camSelect'),cams,state.deviceSettings.camId);
  }catch(e){$('deviceMsg').textContent='خطأ في قراءة الأجهزة: '+e.message;$('deviceMsg').className='info-msg error';}
}

let micTestStream=null,micTestAnalyser=null,micTestAnim=null;
async function testMic(){
  if(micTestStream){micTestStream.getTracks().forEach(t=>t.stop());micTestStream=null;cancelAnimationFrame(micTestAnim);$('micTestLevel').style.width='0%';$('testMicBtn').textContent='اختبار الميكروفون';return;}
  try{
    const micId=$('micSelect').value;
    micTestStream=await navigator.mediaDevices.getUserMedia({audio:micId?{deviceId:{exact:micId}}:true,video:false});
    const ctx=new AudioContext();const src=ctx.createMediaStreamSource(micTestStream);
    micTestAnalyser=ctx.createAnalyser();micTestAnalyser.fftSize=256;src.connect(micTestAnalyser);
    const data=new Uint8Array(micTestAnalyser.frequencyBinCount);
    const update=()=>{micTestAnalyser.getByteFrequencyData(data);const avg=data.reduce((a,b)=>a+b,0)/data.length;$('micTestLevel').style.width=Math.min(avg*2,100)+'%';micTestAnim=requestAnimationFrame(update);};update();
    $('testMicBtn').textContent='إيقاف الاختبار';
  }catch(e){$('deviceMsg').textContent='خطأ: '+e.message;$('deviceMsg').className='info-msg error';}
}

function saveDeviceSettings(){
  state.deviceSettings.micId=$('micSelect').value;
  state.deviceSettings.speakerId=$('speakerSelect').value;
  state.deviceSettings.camId=$('camSelect').value;
  localStorage.setItem('sahar_devices',JSON.stringify(state.deviceSettings));
  // Apply speaker to all audio elements
  if($('speakerSelect').value && typeof HTMLMediaElement.prototype.setSinkId !== 'undefined'){
    document.querySelectorAll('audio,video').forEach(el=>{if(el.setSinkId)el.setSinkId($('speakerSelect').value).catch(()=>{});});
  }
  if(micTestStream){micTestStream.getTracks().forEach(t=>t.stop());micTestStream=null;cancelAnimationFrame(micTestAnim);}
  $('deviceModal').style.display='none';
  toast('تم حفظ إعدادات الجهاز ✓','success');
}

// ── Send Message ───────────────────────────────
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
  const reader=new FileReader();
  reader.onload=e=>{
    state.socket?.emit('send_message',{roomId:state.currentRoom.id,content:'[صورة]',type:'image',imageData:e.target.result,replyTo:null,textColor:'#000000',fontSize:14,bold:false,italic:false});
  };
  reader.readAsDataURL(file);
}

function startReply(mid,content,nick){state.replyTo=mid;$('replySnippet').textContent=nick+': '+content.slice(0,60);$('replyBar').style.display='flex';$('msgInput').focus();}
function cancelReply(){state.replyTo=null;$('replyBar').style.display='none';}
async function delMsg(mid,lineEl){if(!confirm('حذف الرسالة؟'))return;try{await api('/messages/'+mid,'DELETE');lineEl.querySelector('.msg-text').textContent='[تم حذف هذه الرسالة]';lineEl.querySelector('.msg-text').style.cssText='color:#aaa;font-style:italic';}catch(e){toast(e.message,'error');}}
function showReactPick(e,mid){
  e.stopPropagation();const q=['❤️','😂','😍','👏','🔥','😢','😡','👍','🌹','💯'];
  document.querySelector('.qr-pick')?.remove();
  const p=el('div','qr-pick');p.style.cssText=`position:fixed;background:#eef1f7;border:1px solid #a0b0d0;border-radius:3px;padding:5px 8px;display:flex;gap:4px;z-index:400;box-shadow:2px 2px 6px rgba(0,0,0,.3);top:${e.clientY-38}px;left:${e.clientX-80}px;`;
  q.forEach(emoji=>{const b=el('span','emoji-item',emoji);b.style.fontSize='16px';b.addEventListener('click',()=>{state.socket?.emit('add_reaction',{messageId:mid,roomId:state.currentRoom?.id,emoji});p.remove();});p.appendChild(b);});
  document.body.appendChild(p);
  setTimeout(()=>document.addEventListener('click',()=>p.remove(),{once:true}),0);
}
function startTyping(){if(!state.isTyping&&state.currentRoom){state.isTyping=true;state.socket?.emit('typing_start',{roomId:state.currentRoom.id});}clearTimeout(state.typingTimer);state.typingTimer=setTimeout(stopTyping,2500);}
function stopTyping(){if(state.isTyping&&state.currentRoom){state.isTyping=false;state.socket?.emit('typing_stop',{roomId:state.currentRoom.id});}clearTimeout(state.typingTimer);}

// ── PM ─────────────────────────────────────────
function openPm(target){state.pmTarget=target;$('pmTitle').textContent='💬 '+target.nickname;$('pmMsgs').innerHTML='';$('pmPanel').style.display='flex';if(!target.userId?.startsWith('guest_')){api('/messages/private/'+target.userId).then(msgs=>{msgs.forEach(m=>appendPmMsg(m,m.from_id===state.user.id));$('pmMsgs').scrollTop=$('pmMsgs').scrollHeight;}).catch(()=>{});}}
function appendPmMsg(msg,sent){const d=el('div','pm-msg '+(sent?'sent':'recv'));const f=el('div','pm-msg-from',sent?'أنت':(msg.from_nickname||msg.from_username));d.appendChild(f);d.appendChild(document.createTextNode(msg.content));$('pmMsgs').appendChild(d);$('pmMsgs').scrollTop=$('pmMsgs').scrollHeight;}
function sendPm(){const c=$('pmInput').value.trim();if(!c||!state.pmTarget)return;if(state.myMuteStatus?.pm){toast('🔇 أنت ممنوع من الرسائل الخاصة','error');return;}state.socket?.emit('private_message',{toUserId:state.pmTarget.userId,toUsername:state.pmTarget.username||state.pmTarget.nickname,content:c});$('pmInput').value='';}

// ── Rooms CRUD ─────────────────────────────────
function openAddRoom(){state.editingRoom=null;$('roomModalTitle').textContent='إضافة غرفة';$('roomName').value='';$('roomDesc').value='';$('roomPrivate').checked=false;$('deleteRoomBtn').style.display='none';$('roomMsg').textContent='';state.selectedRoomIcon='💬';$('roomIconGrid').querySelectorAll('.ri-opt').forEach(o=>o.classList.toggle('selected',o.textContent==='💬'));$('roomModal').style.display='flex';}
function openEditRoom(room){state.editingRoom=room;$('roomModalTitle').textContent='تعديل الغرفة';$('roomName').value=room.name;$('roomDesc').value=room.description||'';$('roomPrivate').checked=room.is_private;$('deleteRoomBtn').style.display='';$('roomMsg').textContent='';state.selectedRoomIcon=room.icon||'💬';$('roomIconGrid').querySelectorAll('.ri-opt').forEach(o=>o.classList.toggle('selected',o.textContent===room.icon));$('roomModal').style.display='flex';}
async function saveRoom(){const name=$('roomName').value.trim(),desc=$('roomDesc').value.trim(),priv=$('roomPrivate').checked,icon=state.selectedRoomIcon;if(!name){$('roomMsg').textContent='الاسم مطلوب';$('roomMsg').className='info-msg error';return;}try{if(state.editingRoom)await api('/rooms/'+state.editingRoom.id,'PATCH',{name,description:desc,icon,is_private:priv});else await api('/rooms','POST',{name,description:desc,icon,is_private:priv});$('roomModal').style.display='none';await loadRooms();toast('تم حفظ الغرفة ✓','success');}catch(e){$('roomMsg').textContent=e.message;$('roomMsg').className='info-msg error';}}
async function deleteRoom(){if(!confirm('حذف هذه الغرفة؟'))return;try{await api('/rooms/'+state.editingRoom.id,'DELETE');$('roomModal').style.display='none';if(state.currentRoom?.id===state.editingRoom.id){state.currentRoom=null;$('menuRoomName').textContent='سهر الليالي';$('messagesArea').innerHTML='';}await loadRooms();toast('تم حذف الغرفة','success');}catch(e){toast(e.message,'error');}}

// ── Rules ──────────────────────────────────────
async function openRules(){if(!state.currentRoom){toast('اختر غرفة أولاً','error');return;}try{const r=await api('/rooms/'+state.currentRoom.id);$('rulesDisplay').textContent=r.rules||'';$('rulesEdit').value=r.rules||'';}catch{}$('rulesEdit').style.display='none';$('saveRulesBtn').style.display='none';updateAdminUI();$('rulesModal').style.display='flex';}
async function saveRules(){try{await api('/rooms/'+state.currentRoom.id,'PATCH',{rules:$('rulesEdit').value});$('rulesDisplay').textContent=$('rulesEdit').value;$('rulesEdit').style.display='none';$('saveRulesBtn').style.display='none';$('editRulesBtn').style.display='';toast('تم حفظ القواعد ✓','success');}catch(e){toast(e.message,'error');}}

// ── Profile ────────────────────────────────────
function openProfile(){const u=state.user;$('profAvatarBig').textContent=u.avatar||'🌙';$('profNick').value=u.nickname||'';$('profBio').value=u.bio||'';$('profColorInput').value=state.textColor;$('profColorPreview').textContent=state.textColor;state.selectedAvatar=u.avatar||'🌙';$('profileAvatarGrid').querySelectorAll('.av-opt').forEach(o=>o.classList.toggle('selected',o.textContent===state.selectedAvatar));$('profileModal').style.display='flex';$('profMsg').textContent='';}
async function saveProfile(){
  try{
    const textColor=$('profColorInput').value;
    const u=await api('/users/me/profile','PATCH',{nickname:$('profNick').value.trim(),bio:$('profBio').value.trim(),avatar:state.selectedAvatar,text_color:textColor});
    state.user={...state.user,...u};localStorage.setItem('sahar_user',JSON.stringify(state.user));
    $('myAvatarEl').textContent=state.user.avatar;$('myNickEl').textContent=state.user.nickname;
    applyColor(textColor);
    $('profMsg').textContent='تم الحفظ ✓';$('profMsg').className='info-msg success';
  }catch(e){$('profMsg').textContent=e.message;$('profMsg').className='info-msg error';}
}
async function changePass(){const c=$('curPass').value,n=$('newPass').value;if(!c||!n){$('profMsg').textContent='أدخل كلمتي المرور';$('profMsg').className='info-msg error';return;}try{await api('/users/me/password','PATCH',{currentPassword:c,newPassword:n});$('curPass').value='';$('newPass').value='';$('profMsg').textContent='تم التغيير ✓';$('profMsg').className='info-msg success';}catch(e){$('profMsg').textContent=e.message;$('profMsg').className='info-msg error';}}

// ── Room Manage ────────────────────────────────
function openRoomManage(){$('roomManagePanel').style.display='flex';loadAccountsPanel();}
function switchRmPanel(name){
  document.querySelectorAll('.rm-nav-item').forEach(i=>i.classList.toggle('active',i.dataset.panel===name));
  document.querySelectorAll('.rm-panel').forEach(p=>p.classList.remove('active'));
  const panel=$('rmp-'+name);if(panel)panel.classList.add('active');
  if(name==='accounts')loadAccountsPanel();
  if(name==='banned')loadBannedPanel();
  if(name==='logs'){state.socket?.emit('basil_get_logs');renderManageLogs();}
  if(name==='adminlogs'){state.socket?.emit('basil_get_logs');renderManageLogs();}
  if(name==='rooms')loadRoomsPanel();
  if(name==='allusers')state.socket?.emit('basil_get_online_all');
}

async function loadAccountsPanel(){
  try{
    const users=await api('/admin/users');
    const q=($('accountSearch')?.value||'').toLowerCase();
    const filtered=users.filter(u=>u.nickname.toLowerCase().includes(q)||u.username.includes(q));
    const body=$('accountsBody');body.innerHTML='';
    let members=0,mods=0,admins=0;
    filtered.forEach(u=>{
      if(u.role==='moderator')mods++;else if(u.role==='admin')admins++;else members++;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><b style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</b><br><small>${u.username}</small></td><td><span style="color:${ROLE_COLORS[u.role]||'#000'};font-weight:700">${ROLE_LBL[u.role]||u.role}</span></td><td>${u.status==='online'?'🟢':'⚫'} ${u.status||'offline'}</td><td dir="ltr" style="font-size:10px">${u.last_ip||'-'}</td><td>${u.country||'-'}</td><td style="white-space:nowrap"><button class="rm-btn" onclick="changeRole({userId:'${u.id}',nickname:'${u.nickname}',role:'${u.role}'})">رتبة</button> <button class="rm-btn" onclick="openPermDialog({userId:'${u.id}',nickname:'${u.nickname}',permissions:${JSON.stringify(u.permissions||{})}})">صلاحيات</button> <button class="rm-btn rm-btn-red" onclick="banUser({userId:'${u.id}',nickname:'${u.nickname}',fingerprint:'${u.fingerprint||''}',ip:'${u.last_ip||''}'})">حظر</button></td>`;
      body.appendChild(tr);
    });
    $('cntMembers').textContent=members;$('cntMods').textContent=mods;$('cntAdmins').textContent=admins;$('cntTotal').textContent=filtered.length;
  }catch(e){console.error(e);}
}

async function loadBannedPanel(){
  try{
    const bans=await api('/admin/bans');
    const body=$('bannedBody');body.innerHTML='';
    bans.forEach(b=>{
      const tr=document.createElement('tr');
      const rem=b.expires_at?new Date(b.expires_at).toLocaleString('ar'):'دائم';
      tr.innerHTML=`<td>${b.users?.nickname||'-'}</td><td dir="ltr" style="font-size:9px">${b.fingerprint||b.ip||'-'}</td><td>-</td><td>${b.reason||'-'}</td><td>${new Date(b.created_at).toLocaleString('ar')}</td><td>${rem}</td><td><button class="rm-btn rm-btn-green" onclick="unbanUser('${b.user_id}')">رفع</button></td>`;
      body.appendChild(tr);
    });
  }catch(e){console.error(e);}
}
async function unbanUser(userId){try{await api('/admin/ban/'+userId,'DELETE');toast('تم رفع الحظر','success');loadBannedPanel();}catch(e){toast(e.message,'error');}}

function loadRoomsPanel(){
  const body=$('roomsBody');body.innerHTML='';
  state.rooms.forEach(r=>{
    const locked=r._locked||false;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.icon}</td><td><b>${r.name}</b></td><td>${r.description||'-'}</td><td>${r.is_private?'✓':''}</td><td>${locked?'🔒 نعم':'لا'}</td><td><button class="rm-btn" onclick="openEditRoom(state.rooms.find(x=>x.id==='${r.id}'))">تعديل</button>${isBasil()?`<button class="rm-btn" onclick="openRoomLockDialog('${r.id}')">🔒 قفل</button>`:''}`;
    body.appendChild(tr);
  });
}

function renderManageLogs(){
  const lb=$('logsBody');if(lb){lb.innerHTML='';state.roomLogs.slice(0,50).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.nickname}</b></td><td dir="ltr" style="font-size:9px">${l.ip||'-'}</td><td>${l.country||'-'}</td><td>${l.joinedAt?new Date(l.joinedAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt?new Date(l.leftAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt&&l.joinedAt?Math.round((new Date(l.leftAt)-new Date(l.joinedAt))/60000)+'د':'متصل'}</td>`;lb.appendChild(tr);});}
  const ab=$('adminLogsBody');if(ab){ab.innerHTML='';state.adminLogs.slice(0,50).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.by}</b></td><td>${l.action}</td><td>${l.target}</td><td>${l.date}</td>`;ab.appendChild(tr);});}
}

function saveVoiceSettings(){state.roomSettings.freeMic=$('vs-freemic').checked;state.roomSettings.requireHand=$('vs-requirehand').checked;state.roomSettings.maxMicTime=parseInt($('vs-maxtime').value)||0;state.roomSettings.maxSpeakers=parseInt($('vs-maxspeakers').value)||1;state.roomSettings.guestMic=$('vs-guestmic').checked;toast('تم حفظ إعدادات الصوت ✓','success');}
function saveWebcamSettings(){state.roomSettings.camAllow=$('wc-allow').checked;state.roomSettings.camRequireApproval=$('wc-requireapproval').checked;state.roomSettings.whoCan=$('wc-whoCan').value;state.roomSettings.maxCams=parseInt($('wc-maxcams').value)||5;toast('تم حفظ إعدادات الكاميرا ✓','success');}
function saveDesignSettings(){state.roomSettings.welcomeMsg=$('d-welcomeMsg').value||'مرحباً %NAME%';$('messagesArea').style.background=$('d-bgColor').value;toast('تم تطبيق التصميم ✓','success');}
function saveAdvancedSettings(){state.roomSettings.noAvatars=$('adv-noAvatars').checked;state.roomSettings.noURLs=$('adv-noURLs').checked;state.roomSettings.lockMode=document.querySelector('input[name="lockMode"]:checked')?.value||'open';renderUsers();toast('تم حفظ الإعدادات ✓','success');}

// Add account
async function doAddAccount(){
  const u=$('newAccUser').value.trim(),n=$('newAccNick').value.trim(),p=$('newAccPass').value,r=$('newAccRole').value;
  if(!u||!n||!p){$('addAccountMsg').textContent='جميع الحقول مطلوبة';$('addAccountMsg').className='info-msg error';return;}
  const perms={};PERMS_LIST.forEach(pr=>{perms[pr.key]=$('nacp_'+pr.key)?.checked||false;});
  try{
    await api('/auth/register','POST',{username:u,nickname:n,password:p,avatar:'🌙',fingerprint:''});
    // Set role and permissions
    const users=await api('/admin/users');
    const newUser=users.find(x=>x.username===u.toLowerCase());
    if(newUser){await api('/admin/role/'+newUser.id,'PATCH',{role:r});await api('/admin/permissions/'+newUser.id,'PATCH',{permissions:perms});}
    $('addAccountModal').style.display='none';$('addAccountMsg').textContent='';
    toast('تم إنشاء الحساب ✓','success');loadAccountsPanel();
  }catch(e){$('addAccountMsg').textContent=e.message;$('addAccountMsg').className='info-msg error';}
}

// ── Basil Spy Panel ────────────────────────────
function openSpyPanel(){
  $('spyPanel').style.display='flex';
  state.socket?.emit('basil_get_all_rooms');
  state.socket?.emit('spy_pms');
  state.socket?.emit('basil_get_logs');
  state.socket?.emit('basil_get_online_all');
}

function renderSpyRooms(){
  const list=$('spyRoomList');if(!list)return;list.innerHTML='';
  state.spyRooms.forEach(r=>{
    const li=el('li','spy-room-item',r.icon+' '+r.name);
    li.addEventListener('click',()=>{document.querySelectorAll('.spy-room-item').forEach(i=>i.classList.remove('active'));li.classList.add('active');$('spyCurrentRoom').textContent=r.name;state.socket?.emit('spy_room',{roomId:r.id});});
    list.appendChild(li);
  });
}
function renderSpyHistory(roomId){const msgs=state.spyMessages[roomId]||[];const area=$('spyMessages');if(!area)return;area.innerHTML='';msgs.forEach(m=>{const d=el('div','spy-msg-line');d.innerHTML=`<span class="spy-ts">[${fmtTime(m.created_at)}]</span> <b>${m.nickname}:</b> <span>${m.type==='image'?'[صورة]':m.content}</span>`;area.appendChild(d);});area.scrollTop=area.scrollHeight;}
function renderSpyPms(){const list=$('spyPmList');if(!list)return;list.innerHTML='';state.spyPms.forEach(m=>{const d=el('div','spy-msg-line');d.innerHTML=`<span class="spy-ts">[${fmtTime(m.created_at)}]</span> <b>${m.from_username}→${m.to_username}:</b> ${m.content}`;list.appendChild(d);});}
function appendSpyLog(text,time){const area=$('spyLiveLog');if(!area)return;const d=el('div','spy-msg-line');d.innerHTML=`<span class="spy-ts">[${fmtTime(time)}]</span> ${text}`;area.appendChild(d);area.scrollTop=area.scrollHeight;}
function renderSpyLogs(){const lb=$('spyLogsBody');if(!lb)return;lb.innerHTML='';state.roomLogs.slice(0,60).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.nickname}</b></td><td dir="ltr" style="font-size:9px">${l.ip||'-'}</td><td>${l.country||'-'}</td><td>${l.joinedAt?new Date(l.joinedAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt?new Date(l.leftAt).toLocaleString('ar'):'-'}</td><td>${l.leftAt&&l.joinedAt?Math.round((new Date(l.leftAt)-new Date(l.joinedAt))/60000)+'د':'متصل'}</td>`;lb.appendChild(tr);});const ab=$('spyAdminLogsBody');if(!ab)return;ab.innerHTML='';state.adminLogs.slice(0,60).forEach(l=>{const tr=document.createElement('tr');tr.innerHTML=`<td><b>${l.by}</b></td><td>${l.action}</td><td>${l.target}</td><td>${l.date}</td>`;ab.appendChild(tr);});}
function renderAllOnline(users){
  [$('allOnlineBody'),$('allOnlineBodySpy')].forEach(body=>{
    if(!body)return;body.innerHTML='';
    users.forEach(u=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${u.avatar||'🌙'} <b style="color:${ROLE_COLORS[u.role]||'#000'}">${u.nickname}</b></td><td>${ROLE_LBL[u.role]||u.role}</td><td>${u.roomId?state.rooms.find(r=>r.id===u.roomId)?.name||u.roomId:'-'}</td><td dir="ltr" style="font-size:9px">${u.ip||'-'}</td><td>${u.country||'-'}</td><td dir="ltr" style="font-size:9px">${(u.fingerprint||'').slice(0,14)}...</td>`;body.appendChild(tr);});
  });
}

// ── Room Lock (Basil) ──────────────────────────
function openRoomLockDialog(roomId){
  state._lockingRoomId=roomId;
  $('roomPassInput').value='';
  $('roomPassModal').style.display='flex';
}

// ── Undercover ─────────────────────────────────
function toggleUndercover(){
  if(!isBasil())return;
  state.undercover=!state.undercover;
  const btn=$('undercoverBtn');
  if(btn){btn.textContent='👁 التخفي: '+(state.undercover?'مفعّل':'معطّل');btn.style.background=state.undercover?'linear-gradient(to bottom,#800080,#600060)':'linear-gradient(to bottom,#6aa0f8,#3878d8)';}
  // Indicator bar
  let ind=document.querySelector('.undercover-bar');
  if(state.undercover){if(!ind){ind=el('div','undercover-bar','👁 وضع التخفي مفعّل');document.body.appendChild(ind);}}else{ind?.remove();}
  toast(state.undercover?'👁 وضع التخفي مفعّل':'👁 وضع التخفي معطّل',state.undercover?'info':'success');
  if(state.currentRoom&&state.socket){state.socket.disconnect();setTimeout(()=>{state.socket=null;connectSocket();setTimeout(()=>joinRoom(state.currentRoom,state.undercover,''),1500);},500);}
}

// ── Spy nav switching ──────────────────────────
function initSpyNav(){
  document.querySelectorAll('.spy-nav-item').forEach(item=>{
    item.addEventListener('click',()=>{
      document.querySelectorAll('.spy-nav-item').forEach(i=>i.classList.remove('active'));
      document.querySelectorAll('.spy-panel').forEach(p=>p.classList.remove('active'));
      item.classList.add('active');
      const p=$('spp-'+item.dataset.sp);if(p)p.classList.add('active');
      if(item.dataset.sp==='online')state.socket?.emit('basil_get_online_all');
      if(item.dataset.sp==='pms')state.socket?.emit('spy_pms');
      if(item.dataset.sp==='logs')state.socket?.emit('basil_get_logs');
      if(item.dataset.sp==='rooms')state.socket?.emit('basil_get_all_rooms');
    });
  });
}

// ── Logout ─────────────────────────────────────
function doLogout(){
  Voice.cleanup();
  state.localStream?.getTracks().forEach(t=>t.stop());
  state.socket?.disconnect();state.socket=null;
  api('/auth/logout','POST').catch(()=>{});
  localStorage.removeItem('sahar_token');localStorage.removeItem('sahar_user');
  state.token=null;state.user=null;state.currentRoom=null;
  $('chatScreen').classList.remove('active');$('loginScreen').classList.add('active');
}

// ── Toast ──────────────────────────────────────
function toast(msg,type='info'){const t=el('div','toast '+type,msg);$('toastContainer').appendChild(t);setTimeout(()=>t.remove(),3500);}

// ── Bindings ───────────────────────────────────
function bindChat(){
  $('sendBtn').addEventListener('click',sendMsg);
  $('msgInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});
  $('msgInput').addEventListener('input',()=>{autoResize($('msgInput'));startTyping();});
  $('emojiBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('emojiPicker');p.style.display=p.style.display==='none'?'flex':'none';});
  document.addEventListener('click',()=>{$('emojiPicker').style.display='none';$('colorPanel').style.display='none';});
  $('colorBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('colorPanel');p.style.display=p.style.display==='none'?'block':'none';});
  $('applyCustomColor').addEventListener('click',()=>{applyColor($('customColorInput').value);$('colorPanel').style.display='none';});
  document.querySelectorAll('.fsize').forEach(btn=>{btn.addEventListener('click',()=>{state.fontSize=parseInt(btn.dataset.size);$('msgInput').style.fontSize=state.fontSize+'px';document.querySelectorAll('.fsize').forEach(b=>b.classList.remove('active'));btn.classList.add('active');});});
  $('boldBtn').addEventListener('click',()=>{state.bold=!state.bold;$('boldBtn').classList.toggle('active',state.bold);$('msgInput').style.fontWeight=state.bold?'700':'400';});
  $('italicBtn').addEventListener('click',()=>{state.italic=!state.italic;$('italicBtn').classList.toggle('active',state.italic);$('msgInput').style.fontStyle=state.italic?'italic':'normal';});
  $('imageBtn')?.addEventListener('click',()=>$('imageInput').click());
  $('imageInput')?.addEventListener('change',e=>{if(e.target.files[0])sendImage(e.target.files[0]);e.target.value='';});
  $('talkBtn').addEventListener('click',toggleTalk);
  $('muteBtn').addEventListener('click',()=>{if(Voice.getStream()){const t=Voice.getStream().getAudioTracks()[0];if(t){t.enabled=!t.enabled;$('muteBtn').classList.toggle('active',!t.enabled);toast(t.enabled?'🔊 رُفع الكتم':'🔇 تم الكتم','info');}}});
  $('camBtn').addEventListener('click',toggleCam);
  $('camSettingsBtn').addEventListener('click',openDeviceSettings);
  $('handBtn').addEventListener('click',()=>{if(state.handRaised){state.socket?.emit('lower_hand');state.handRaised=false;$('handBtn').classList.remove('active');toast('✋ تم إنزال يدك','info');}else{state.socket?.emit('raise_hand');state.handRaised=true;$('handBtn').classList.add('active');toast('✋ تم رفع يدك','info');}});
  $('clearChatBtn')?.addEventListener('click',()=>{if(confirm('مسح جميع رسائل الغرفة؟'))state.socket?.emit('clear_chat',{roomId:state.currentRoom?.id});});
  $('addRoomBtn')?.addEventListener('click',openAddRoom);
  $('roomManageBtn')?.addEventListener('click',openRoomManage);
  $('rulesBtn').addEventListener('click',openRules);
  $('leaveRoomBtn').addEventListener('click',()=>{state.currentRoom=null;$('messagesArea').innerHTML='';$('menuRoomName').textContent='سهر الليالي';$('roomTabName').textContent='اختر غرفة';document.querySelectorAll('.room-item').forEach(i=>i.classList.remove('active'));});
  $('profileItem').addEventListener('click',openProfile);
  $('logoutItem').addEventListener('click',doLogout);
  $('notifBell').addEventListener('click',()=>{state.notifications=0;$('notifCount').style.display='none';});
  // Modals
  $('closeProfile').addEventListener('click',()=>$('profileModal').style.display='none');
  $('saveProfileBtn').addEventListener('click',saveProfile);
  $('changePassBtn').addEventListener('click',changePass);
  $('profColorInput').addEventListener('input',e=>{$('profColorPreview').textContent=e.target.value;});
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
  document.querySelectorAll('.rm-nav-item').forEach(item=>{item.addEventListener('click',()=>switchRmPanel(item.dataset.panel));});
  $('accountSearch')?.addEventListener('input',loadAccountsPanel);
  $('saveVoiceBtn')?.addEventListener('click',saveVoiceSettings);
  $('saveWebcamBtn')?.addEventListener('click',saveWebcamSettings);
  $('saveDesignBtn')?.addEventListener('click',saveDesignSettings);
  $('saveAdvancedBtn')?.addEventListener('click',saveAdvancedSettings);
  $('addRoomManageBtn')?.addEventListener('click',()=>{$('roomManagePanel').style.display='none';openAddRoom();});
  $('addAccountBtn')?.addEventListener('click',()=>$('addAccountModal').style.display='flex');
  $('closeAddAccount')?.addEventListener('click',()=>$('addAccountModal').style.display='none');
  $('cancelAddAccount')?.addEventListener('click',()=>$('addAccountModal').style.display='none');
  $('doAddAccount')?.addEventListener('click',doAddAccount);
  // Mute
  $('closeMuteModal')?.addEventListener('click',()=>$('muteModal').style.display='none');
  $('doMuteBtn')?.addEventListener('click',doMute);
  $('cancelMuteBtn')?.addEventListener('click',()=>$('muteModal').style.display='none');
  // Permissions
  $('closePermModal')?.addEventListener('click',()=>$('permModal').style.display='none');
  $('closePermModal2')?.addEventListener('click',()=>$('permModal').style.display='none');
  $('savePermBtn')?.addEventListener('click',savePermissions);
  // Device
  $('closeDeviceModal')?.addEventListener('click',()=>{if(micTestStream){micTestStream.getTracks().forEach(t=>t.stop());micTestStream=null;cancelAnimationFrame(micTestAnim);}$('deviceModal').style.display='none';});
  $('testMicBtn')?.addEventListener('click',testMic);
  $('saveDeviceBtn')?.addEventListener('click',saveDeviceSettings);
  // Room pass entry
  $('closeRoomPassEntry')?.addEventListener('click',()=>$('roomPassEntryModal').style.display='none');
  $('roomPassEntryInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')$('submitRoomPassBtn')?.click();});
  // Room lock (Basil)
  $('closeRoomPass')?.addEventListener('click',()=>$('roomPassModal').style.display='none');
  $('saveRoomPassBtn')?.addEventListener('click',()=>{
    const pw=$('roomPassInput').value;
    const roomId=state._lockingRoomId||state.currentRoom?.id;
    if(roomId){state.socket?.emit('set_room_password',{roomId,password:pw});$('roomPassModal').style.display='none';toast(pw?'تم قفل الغرفة بكلمة مرور 🔒':'تم رفع القفل','success');}
  });
  $('lockRoomBtn')?.addEventListener('click',()=>{if(state.currentRoom)openRoomLockDialog(state.currentRoom.id);});
  // Spy panel
  $('closeSpyPanel')?.addEventListener('click',()=>$('spyPanel').style.display='none');
  $('undercoverBtn')?.addEventListener('click',toggleUndercover);
  initSpyNav();
  // F2 shortcut
  document.addEventListener('keydown',e=>{if(e.key==='F2'&&isAdmin())openRoomManage();});
}

// ── Helpers ────────────────────────────────────
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
