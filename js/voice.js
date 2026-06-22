/* سهر الليالي — Voice Engine v7 (TURN + SFU-style broadcast) */
const Voice = (() => {
  const peers    = new Map(); // socketId → RTCPeerConnection
  const audioEls = new Map(); // socketId → HTMLAudioElement
  let localStream = null, isSpeaker = false;
  let audioCtx = null, animFrame = null;
  let micTimerInterval = null;
  let micTimeUsed = 0;

  // Free TURN servers (metered.ca free tier)
  const ICE = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // Free TURN fallback
    { urls: 'turn:openrelay.metered.ca:80',    username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',   username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
  ]};

  async function startSpeaking(socket, roomId, deviceId, maxTime) {
    try {
      const constraints = {
        audio: deviceId
          ? { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      isSpeaker   = true;
      micTimeUsed = 0;

      socket.emit('join_stage', { roomId });
      _startAnalyser(socket);

      // Auto-stop after maxTime seconds (if > 0)
      if (maxTime && maxTime > 0) {
        micTimerInterval = setInterval(() => {
          micTimeUsed++;
          // Emit timer tick to update UI
          const remaining = maxTime - micTimeUsed;
          window.dispatchEvent(new CustomEvent('mic_timer', { detail: { remaining, max: maxTime } }));
          if (micTimeUsed >= maxTime) {
            clearInterval(micTimerInterval);
            stopSpeaking(socket);
            window.dispatchEvent(new CustomEvent('mic_time_up'));
          }
        }, 1000);
      }

      console.log('🎤 Mic started:', localStream.getAudioTracks().map(t => t.label));
      return true;
    } catch (err) {
      console.error('Mic error:', err.name, err.message);
      if (err.name === 'NotAllowedError')  _toast('❌ امنح إذن الميكروفون في المتصفح');
      else if (err.name === 'NotFoundError') _toast('❌ لا يوجد ميكروفون');
      else _toast('❌ ' + err.message);
      return false;
    }
  }

  function stopSpeaking(socket) {
    if (!isSpeaker) return;
    isSpeaker = false;
    clearInterval(micTimerInterval);
    peers.forEach(pc => { try { pc.close(); } catch {} });
    peers.clear();
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (animFrame)   { cancelAnimationFrame(animFrame); animFrame = null; }
    if (audioCtx)    { try { audioCtx.close(); } catch {} audioCtx = null; }
    socket.emit('leave_stage');
    socket.emit('speaking', { isSpeaking: false });
  }

  // Speaker → create offer for each new listener
  async function onNewListener(socket, listenerSocketId) {
    if (!isSpeaker || !localStream) return;
    console.log('📡 New listener:', listenerSocketId.slice(0,8));
    const pc = _createPC(listenerSocketId, socket, false);
    localStream.getAudioTracks().forEach(track => pc.addTrack(track, localStream));
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: false });
      await pc.setLocalDescription(offer);
      socket.emit('webrtc_offer', { to: listenerSocketId, offer: pc.localDescription, kind: 'voice' });
    } catch (err) { console.error('offer:', err); }
  }

  // Listener hears speaker joined → signal ready
  async function onSpeakerJoined(socket, speakerSocketId, nickname) {
    if (isSpeaker) return;
    _toast('🎤 ' + nickname + ' على الميكروفون');
    console.log('🔊 Speaker joined, sending listener_ready');
    socket.emit('listener_ready', { speakerSocketId });
  }

  function onSpeakerLeft(speakerSocketId) {
    _closePeer(speakerSocketId);
    _removeAudio(speakerSocketId);
  }

  // Listener receives offer
  async function onOffer(socket, fromSocketId, offer) {
    console.log('📨 Offer from speaker:', fromSocketId.slice(0,8));
    const pc = _createPC(fromSocketId, socket, true);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { to: fromSocketId, answer: pc.localDescription, kind: 'voice' });
      console.log('✅ Answer sent');
    } catch (err) { console.error('answer:', err); }
  }

  // Speaker receives answer
  async function onAnswer(fromSocketId, answer) {
    const pc = peers.get(fromSocketId);
    if (!pc || pc.signalingState === 'stable') return;
    try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); }
    catch (err) { console.error('setRemote:', err); }
  }

  async function onIce(fromSocketId, candidate) {
    const pc = peers.get(fromSocketId);
    if (!pc || !candidate) return;
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
    catch {}
  }

  function _createPC(remoteSocketId, socket, isListener) {
    _closePeer(remoteSocketId);
    const pc = new RTCPeerConnection(ICE);
    peers.set(remoteSocketId, pc);

    pc.onicecandidate = e => {
      if (e.candidate) socket.emit('webrtc_ice', { to: remoteSocketId, candidate: e.candidate, kind: 'voice' });
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log(`ICE[${remoteSocketId.slice(0,6)}]: ${s}`);
      if (s === 'failed') pc.restartIce();
      if (s === 'disconnected') setTimeout(() => { if (pc.iceConnectionState === 'disconnected') _closePeer(remoteSocketId); }, 5000);
    };

    if (isListener) {
      pc.ontrack = e => {
        console.log('🔊 Got track:', e.track.kind, 'readyState:', e.track.readyState);
        if (e.track.kind !== 'audio') return;
        const stream = e.streams?.[0] || new MediaStream([e.track]);
        _playAudio(remoteSocketId, stream);
      };
    }
    return pc;
  }

  function _playAudio(socketId, stream) {
    _removeAudio(socketId);
    const audio      = document.createElement('audio');
    audio.srcObject  = stream;
    audio.autoplay   = true;
    audio.volume     = 1.0;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioEls.set(socketId, audio);

    // Set output device
    try {
      const ds = JSON.parse(localStorage.getItem('sahar_devices') || '{}');
      if (ds.speakerId && audio.setSinkId) audio.setSinkId(ds.speakerId).catch(() => {});
    } catch {}

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => console.log('▶️ Audio playing:', socketId.slice(0,8)))
        .catch(err => { console.warn('Autoplay blocked:', err.name); _showUnmuteBtn(); });
    }
  }

  function _removeAudio(socketId) {
    const a = audioEls.get(socketId);
    if (a) { try { a.pause(); a.srcObject = null; a.remove(); } catch {} audioEls.delete(socketId); }
  }

  function _closePeer(socketId) {
    const pc = peers.get(socketId);
    if (pc) { try { pc.close(); } catch {} peers.delete(socketId); }
  }

  function _startAnalyser(socket) {
    if (!localStream) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(localStream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false, silence = 0;
      const tick = () => {
        if (!isSpeaker) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > 12) {
          silence = 0;
          if (!wasSpeaking) { wasSpeaking = true; socket.emit('speaking', { isSpeaking: true }); }
        } else {
          silence += 50;
          if (wasSpeaking && silence > 400) { wasSpeaking = false; socket.emit('speaking', { isSpeaking: false }); }
        }
        animFrame = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) { console.warn('Analyser:', e); }
  }

  function _showUnmuteBtn() {
    if (document.getElementById('voiceUnmuteBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'voiceUnmuteBtn';
    btn.textContent = '🔊 اضغط للاستماع';
    btn.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 28px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:25px;color:#fff;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.3);';
    btn.addEventListener('click', () => {
      audioEls.forEach(a => { a.play().catch(() => {}); });
      btn.remove();
    });
    document.body.appendChild(btn);
    setTimeout(() => btn?.remove(), 15000);
  }

  function _toast(msg) {
    const c = document.getElementById('toastContainer'); if (!c) return;
    const t = document.createElement('div'); t.className = 'toast info'; t.textContent = msg;
    c.appendChild(t); setTimeout(() => t.remove(), 4000);
  }

  function cleanup() {
    isSpeaker = false;
    clearInterval(micTimerInterval);
    peers.forEach(pc => { try { pc.close(); } catch {} }); peers.clear();
    audioEls.forEach(a => { try { a.pause(); a.srcObject = null; a.remove(); } catch {} }); audioEls.clear();
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (audioCtx) { try { audioCtx.close(); } catch {} audioCtx = null; }
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  return { startSpeaking, stopSpeaking, onNewListener, onSpeakerJoined, onSpeakerLeft, onOffer, onAnswer, onIce, cleanup, isActive: () => isSpeaker, getStream: () => localStream };
})();
