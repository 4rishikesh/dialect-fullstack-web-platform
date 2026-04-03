import { useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC({ socket, roomId, mode, isInitiator, localVideoRef, remoteVideoRef, localAudioRef, remoteAudioRef }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  // ✅ GET MEDIA (FORCE CAMERA/MIC)
  const getMedia = useCallback(async () => {
    try {
      const constraints = mode === 'video'
        ? { audio: true, video: true }
        : { audio: true, video: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log("🎥 MEDIA STREAM STARTED", stream);

      localStreamRef.current = stream;

      // attach to UI
      if (mode === 'video' && localVideoRef?.current) {
        localVideoRef.current.srcObject = stream;
      }

      if (mode === 'voice' && localAudioRef?.current) {
        localAudioRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error('[WebRTC] Media error:', err);
      alert("Camera/Mic permission denied ❌");
      throw err;
    }
  }, [mode, localVideoRef, localAudioRef]);

  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit('webrtc:ice_candidate', { roomId, candidate });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;

      console.log("📡 RECEIVED REMOTE STREAM");

      if (mode === 'video' && remoteVideoRef?.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      if (mode === 'voice' && remoteAudioRef?.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection:', pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  }, [socket, roomId, mode, remoteVideoRef, remoteAudioRef]);

  // ✅ START CALL (FIXED FLOW)
  const startCall = useCallback(async () => {
    if (!socket) return;

    console.log("🚀 START CALL");

    const stream = await getMedia();
    const pc = createPeerConnection(stream);

    if (isInitiator) {
      console.log("📤 SENDING OFFER");

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', { roomId, offer });
    } else {
      console.log("👂 WAITING FOR OFFER");
    }
  }, [socket, roomId, isInitiator, getMedia, createPeerConnection]);

  useEffect(() => {
    if (!socket || (mode !== 'voice' && mode !== 'video')) return;

    const handleOffer = async ({ offer }) => {
      console.log("📥 RECEIVED OFFER");

      if (!pcRef.current) {
        const stream = await getMedia();
        createPeerConnection(stream);
      }

      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit('webrtc:answer', { roomId, answer });
    };

    const handleAnswer = async ({ answer }) => {
      console.log("📥 RECEIVED ANSWER");

      if (!pcRef.current) return;

      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = async ({ candidate }) => {
      if (!pcRef.current) return;

      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice_candidate', handleIce);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice_candidate', handleIce);
    };
  }, [socket, roomId, mode, getMedia, createPeerConnection]);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    return localStreamRef.current.getAudioTracks()[0]?.enabled;
  }, []);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    return localStreamRef.current.getVideoTracks()[0]?.enabled;
  }, []);

  return { startCall, cleanup, toggleMute, toggleVideo };
}