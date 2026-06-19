/* سهر الليالي v6 — Voice Engine (Fixed WebRTC) */
const Voice = (() => {
  const peers   = new Map(); // socketId → RTCPeerConnection
  const audioEls= new Map(); // socketId → HTMLAudioElement
  let localStream=null, isSpeaker=false;
  let audioCtx=null, analyserNode=null, animFrame=null;

  const ICE = { iceServers:[
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:stun1.l.google.com:19302'},
    {urls:'stun:stun2.l.google.com:19302'}
  ]};

  async function startSpeaking(socket, roomId, deviceId) {
    try {
      const constraints = { audio: deviceId ? {deviceId:{exact:deviceId},echoCancellation:true,noiseSuppression:true,autoGainControl:true} : {echoCancellation:true,noiseSuppression:true,autoGainControl:true}, video:false };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      isSpeaker   = true;
      socket.emit('join_stage', { roomId });
      _startAnalyser(socket);
      console.log('🎤 Mic started:', localStream.getAudioTracks().map(t=>t.label));
      return true;
    } catch(err) {
      console.error('Mic error:', err.name, err.message);
      _toast(err.name==='NotAllowedError'?'❌ امنح إذن الميكروفون في المتصفح':err.name==='NotFoundError'?'❌ لا يوجد ميكروفون متصل':'❌ خطأ في الميكروفون: '+err.message);
      return false;
    }
  }

  function stopSpeaking(socket) {
    if (!isSpeaker) return;
    isSpeaker = false;
    peers.forEach(pc=>{try{pc.close();}catch{}});
    peers.clear();
    if (localStream) { localStream.getTracks().forEach(t=>t.stop()); localStream=null; }
    if (animFrame)   { cancelAnimationFrame(animFrame); animFrame=null; }
    if (audioCtx)    { try{audioCtx.close();}catch{}; audioCtx=null; }
    socket.emit('leave_stage');
    socket.emit('speaking', {isSpeaking:false});
  }

  // Called when a new listener is ready — speaker creates offer
  async function onNewListener(socket, listenerSocketId) {
    if (!isSpeaker || !localStream) { console.warn('onNewListener: not speaker or no stream'); return; }
    console.log('📡 New listener:', listenerSocketId);
    const pc = _createPC(listenerSocketId, socket, false);
    localStream.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStream);
      console.log('Track added:', track.label, track.readyState);
    });
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', {to:listenerSocketId, offer:pc.localDescription});
      console.log('✅ Offer sent to:', listenerSocketId);
    } catch(err) { console.error('offer error:', err); }
  }

  // Called when a speaker joins — listener sends ready signal
  async function onSpeakerJoined(socket, speakerSocketId, nickname, avatar) {
    if (isSpeaker) return;
    console.log('🔊 Speaker joined:', nickname, speakerSocketId);
    _toast('🎤 '+nickname+' على الميكروفون');
    socket.emit('listener_ready', {speakerSocketId});
  }

  function onSpeakerLeft(speakerSocketId) {
    console.log('🔇 Speaker left:', speakerSocketId);
    _closePeer(speakerSocketId);
    _removeAudio(speakerSocketId);
  }

  // Listener receives offer from speaker
  async function onOffer(socket, fromSocketId, offer) {
    console.log('📨 Got offer from:', fromSocketId);
    const pc = _createPC(fromSocketId, socket, true);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', {to:fromSocketId, answer:pc.localDescription});
      console.log('✅ Answer sent to:', fromSocketId);
    } catch(err) { console.error('answer error:', err); }
  }

  // Speaker receives answer from listener
  async function onAnswer(fromSocketId, answer) {
    const pc = peers.get(fromSocketId);
    if (!pc) { console.warn('No PC for answer:', fromSocketId); return; }
    try {
      if (pc.signalingState === 'stable') return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('✅ Remote desc set from:', fromSocketId);
    } catch(err) { console.error('setRemote error:', err); }
  }

  async function onIce(fromSocketId, candidate) {
    const pc = peers.get(fromSocketId);
    if (!pc || !candidate) return;
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
    catch(err) { if (!err.message?.includes('ICE')) console.warn('ICE error:', err.message); }
  }

  function _createPC(remoteSocketId, socket, isListener) {
    _closePeer(remoteSocketId);
    const pc = new RTCPeerConnection(ICE);
    peers.set(remoteSocketId, pc);

    pc.onicecandidate = e => {
      if (e.candidate) socket.emit('webrtc_ice', {to:remoteSocketId, candidate:e.candidate});
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE[${remoteSocketId.slice(0,8)}]: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    pc.onconnectionstatechange = () => {
      console.log(`PC[${remoteSocketId.slice(0,8)}]: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') { _closePeer(remoteSocketId); _removeAudio(remoteSocketId); }
    };

    if (isListener) {
      pc.ontrack = e => {
        console.log('🔊 Got track:', e.track.kind, 'streams:', e.streams.length);
        if (e.track.kind !== 'audio') return;
        const stream = e.streams[0] || new MediaStream([e.track]);
        _playAudio(remoteSocketId, stream);
      };
    }
    return pc;
  }

  function _playAudio(socketId, stream) {
    _removeAudio(socketId);
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay  = true;
    audio.volume    = 1.0;
    // Apply saved speaker device
    try {
      const ds = JSON.parse(localStorage.getItem('sahar_devices')||'{}');
      if (ds.speakerId && audio.setSinkId) audio.setSinkId(ds.speakerId).catch(()=>{});
    } catch {}
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioEls.set(socketId, audio);
    audio.play().then(()=>console.log('▶️ Audio playing for:', socketId)).catch(err=>{
      console.warn('Autoplay blocked:', err.name);
      _showUnmuteBtn();
    });
  }

  function _removeAudio(socketId) {
    const a = audioEls.get(socketId);
    if (a) { try{a.pause();a.srcObject=null;a.remove();}catch{}; audioEls.delete(socketId); }
  }

  function _closePeer(socketId) {
    const pc = peers.get(socketId);
    if (pc) { try{pc.close();}catch{}; peers.delete(socketId); }
  }

  function _startAnalyser(socket) {
    if (!localStream) return;
    try {
      audioCtx     = new (window.AudioContext||window.webkitAudioContext)();
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 512;
      const src = audioCtx.createMediaStreamSource(localStream);
      src.connect(analyserNode);
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      let wasSpeaking=false, silenceMs=0;
      const tick = () => {
        if (!isSpeaker) return;
        analyserNode.getByteFrequencyData(data);
        const avg = data.reduce((a,b)=>a+b,0)/data.length;
        const nowSpeaking = avg > 12;
        if (nowSpeaking) { silenceMs=0; if(!wasSpeaking){wasSpeaking=true;socket.emit('speaking',{isSpeaking:true});} }
        else { silenceMs+=50; if(wasSpeaking&&silenceMs>300){wasSpeaking=false;socket.emit('speaking',{isSpeaking:false});} }
        animFrame = requestAnimationFrame(tick);
      };
      tick();
    } catch(err) { console.warn('Analyser error:', err); }
  }

  function _showUnmuteBtn() {
    if (document.getElementById('voiceUnmuteBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'voiceUnmuteBtn';
    btn.textContent = '🔊 اضغط للاستماع للأصوات';
    btn.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:999;padding:10px 24px;background:linear-gradient(to bottom,#4a7fd4,#2a5ab0);border:1px solid #1a3a90;border-radius:4px;color:#fff;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow:2px 2px 8px rgba(0,0,0,.4);';
    btn.addEventListener('click',()=>{audioEls.forEach(a=>a.play().catch(()=>{}));btn.remove();});
    document.body.appendChild(btn);
    setTimeout(()=>btn?.remove(),15000);
  }

  function _toast(msg) {
    const c=document.getElementById('toastContainer');if(!c)return;
    const t=document.createElement('div');t.className='toast info';t.textContent=msg;
    c.appendChild(t);setTimeout(()=>t.remove(),4000);
  }

  function cleanup() {
    isSpeaker=false;
    peers.forEach(pc=>{try{pc.close();}catch{}});peers.clear();
    audioEls.forEach(a=>{try{a.pause();a.srcObject=null;a.remove();}catch{}});audioEls.clear();
    if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
    if(audioCtx){try{audioCtx.close();}catch{};audioCtx=null;}
    if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
  }

  return { startSpeaking, stopSpeaking, onNewListener, onSpeakerJoined, onSpeakerLeft, onOffer, onAnswer, onIce, cleanup, isActive:()=>isSpeaker, getStream:()=>localStream };
})();
