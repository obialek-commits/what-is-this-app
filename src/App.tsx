import { useState, useEffect, useRef } from "react";
import {
  Camera,
  CameraOff,
  RotateCw,
  Sparkles,
  AlertCircle,
  Check,
  Copy,
  RefreshCw,
  Zap,
  Info,
  HelpCircle,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const LOADING_PHRASES = [
  "Analyzing visual patterns...",
  "Running shape detection...",
  "Consulting Gemini 3.5 Flash...",
  "Decoding interesting facts...",
  "Formulating descriptive facts...",
  "Structuring insights...",
];

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [isIdentifying, setIsIdentifying] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [capturedThumb, setCapturedThumb] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Rotate loading phrases while waiting for AI response
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isIdentifying) {
      interval = setInterval(() => {
        setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }, 1600);
    } else {
      setLoadingPhraseIndex(0);
    }
    return () => clearInterval(interval);
  }, [isIdentifying]);

  // Handle stream initialization on load
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  const startCamera = async (mode: "environment" | "user" = "environment") => {
    setError(null);
    setIsLoadingCamera(true);
    try {
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = newStream;
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Camera permissions/access failed:", err);
      // Fallback for laptops/testing machines if environmental camera is unavailable
      if (mode === "environment") {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          streamRef.current = fallbackStream;
          setStream(fallbackStream);
          setFacingMode("user"); // update toggle state
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
          return;
        } catch (innerErr: any) {
          console.error("Mirror camera fallback also failed:", innerErr);
        }
      }

      // Friendly explain permission requirement
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError(
          "Camera access was denied. Please update your browser site settings to allow camera permissions so we can analyze objects."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera hardware found on this browser or device.");
      } else {
        setError(
          `Could not connect to camera: ${
            err.message || "Unknown hardware error"
          }`
        );
      }
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const handleToggleCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  const handleIdentify = async () => {
    if (!videoRef.current || !stream) return;

    try {
      setIsIdentifying(true);
      setAiResponse(null);

      // Capture frame using canvas
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas context");
      }

      // Horizontal flipping if mirroring the front camera
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedThumb(base64Image);

      // Perform backend request
      const response = await fetch("/api/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to identify image");
      }

      const data = await response.json();
      setAiResponse(data.result);
    } catch (err: any) {
      console.error("AI identification error:", err);
      setError(err.message || "Something went wrong while identifying this.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleCopy = () => {
    if (aiResponse) {
      navigator.clipboard.writeText(aiResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans flex items-center justify-center p-0 sm:p-8 relative selection:bg-white/20 selection:text-white">
      {/* Presentation Design Accents (Ambient Background Info) */}
      <div className="hidden lg:block absolute top-10 right-10 text-right opacity-15 pointer-events-none select-none">
        <div className="text-4xl font-serif italic text-white tracking-widest">AI VISION</div>
        <div className="text-[10px] tracking-[0.4em] text-stone-400 mt-1 uppercase font-mono">Build Edition 1.0.42</div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[280px] bg-gradient-to-b from-white/[0.03] to-transparent blur-3xl pointer-events-none" />

      {/* Container Module (Mocking device/premium card on desktop, seamless on mobile) */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[760px] sm:my-4 bg-[#121212] sm:rounded-[48px] sm:border-[6px] sm:border-[#1f1f1f] sm:shadow-2xl flex flex-col justify-between overflow-hidden relative">
        
        {/* Header Section */}
        <header className="pt-10 px-8 pb-4 w-full">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-serif italic text-white tracking-tight">
              What Is This?
            </h1>
            <div className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] text-[#888] font-mono tracking-wider">
              BETA
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#888] mt-1 font-medium">
            Point your camera at anything
          </p>
        </header>

        {/* Interactive Main Area */}
        <main className="flex-1 flex flex-col justify-between px-6 py-2 gap-4">
          
          {/* Viewfinder Area */}
          <div className="flex-1 min-h-[220px] relative aspect-video sm:aspect-[4/3] bg-[#1a1a1a] rounded-[32px] border border-[#2a2a2a] relative overflow-hidden flex flex-col justify-center items-center shadow-lg group">
            {stream && !error ? (
              <video
                id="camera_feed"
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover select-none pointer-events-none ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />
            ) : (
              <div className="p-6 text-center flex flex-col items-center z-10">
                {isLoadingCamera && !error ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-[10px] uppercase tracking-widest text-[#888]">CONNECTING HD VIDEO...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.02]">
                      <CameraOff className="w-5 h-5 text-stone-500" />
                    </div>
                    {error ? (
                      <div className="max-w-xs px-2">
                        <p className="text-stone-300 text-xs mb-3 font-sans leading-relaxed">
                          {error}
                        </p>
                        <button
                          id="retry_camera_btn"
                          onClick={() => startCamera(facingMode)}
                          className="px-4 py-2 bg-white text-black hover:bg-stone-200 active:scale-95 rounded-full text-[11px] uppercase tracking-widest font-bold transition duration-150 cursor-pointer"
                        >
                          Allow Access
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-[#888]">Camera Access Required</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Custom Camera HUD overlays */}
            {stream && !error && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 bg-gradient-to-t from-black/60 to-transparent">
                {/* Simulated focus brackets */}
                <div className="absolute w-8 h-8 border-t border-l border-white/30 top-6 left-6 rounded-tl-md transition-all group-hover:scale-105 duration-300" />
                <div className="absolute w-8 h-8 border-t border-r border-white/30 top-6 right-6 rounded-tr-md transition-all group-hover:scale-105 duration-300" />
                <div className="absolute w-8 h-8 border-b border-l border-white/30 bottom-6 left-6 rounded-bl-md transition-all group-hover:scale-105 duration-300" />
                <div className="absolute w-8 h-8 border-b border-r border-white/30 bottom-6 right-6 rounded-br-md transition-all group-hover:scale-105 duration-300" />

                {/* Laser scan line active when scanning only */}
                <AnimatePresence>
                  {isIdentifying && (
                    <motion.div
                      initial={{ top: "0%" }}
                      animate={{ top: "100%" }}
                      exit={{ opacity: 0 }}
                      transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 2.0,
                        ease: "easeInOut",
                      }}
                      className="absolute left-0 right-0 h-[1px] bg-white/70 shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20"
                    />
                  )}
                </AnimatePresence>

                {/* Status Indicator Bar */}
                <div className="flex justify-between items-center text-[9px] font-mono tracking-widest text-white/50 bg-[#121212]/80 backdrop-blur-md px-3 py-1.5 rounded-full mt-auto border border-white/5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE FEED WORKSTATION
                  </span>
                  <span>
                    {facingMode === "environment" ? "ENV_REAR_CAM" : "USER_FRONT_CAM"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls Area */}
          <div className="flex flex-col items-center gap-4">
            
            {/* Results / Loading panel */}
            <div className="w-full min-h-[145px] flex flex-col justify-start">
              <AnimatePresence mode="wait">
                {/* Loader showing */}
                {isIdentifying && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-2.5xl p-6 text-center flex flex-col items-center justify-center gap-4.5 shadow-xl"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/15 border-t-white rounded-full animate-spin" />
                      <span className="text-[10px] text-[#888] uppercase tracking-widest font-mono">Analyzing image...</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white text-xs font-serif italic tracking-wide">
                        "{LOADING_PHRASES[loadingPhraseIndex]}"
                      </p>
                      <p className="text-[10px] text-stone-500 font-sans">
                        Scanning shapes and querying Gemini 3.5...
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* AI response results showing */}
                {!isIdentifying && aiResponse && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-2.5xl overflow-hidden shadow-xl"
                  >
                    {/* Header bar of result */}
                    <div className="bg-[#121212] border-b border-[#2a2a2a] px-5 py-3.5 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] uppercase tracking-widest text-[#888] font-semibold">
                          Analysis Complete
                        </span>
                      </div>
                      <button
                        id="copy_response_btn"
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-white transition duration-150 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex gap-4 items-start">
                        {capturedThumb && (
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#2a2a2a] shrink-0 bg-[#0a0a0a]">
                            <img
                              src={capturedThumb}
                              alt="Captured snapshot preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-stone-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                            {aiResponse}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Guide suggestion when inactive */}
                {!isIdentifying && !aiResponse && !error && (
                  <motion.div
                    key="ideal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full text-center py-5 text-[#888] flex flex-col items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-[#333]" />
                    <p className="text-[10.5px] max-w-[260px] leading-relaxed">
                      Place an item in the viewfinder frame and tap "Identify" to receive instant structured AI facts.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Identify Key Call to Action */}
            <button
              id="identify_button"
              disabled={!stream || isIdentifying}
              onClick={handleIdentify}
              className="w-full h-16 bg-white text-black disabled:bg-[#1f1f1f] disabled:text-stone-600 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98] shadow-lg disabled:cursor-not-allowed cursor-pointer"
            >
              {isIdentifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Analyzing Image...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-black shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Identify</span>
                </>
              )}
            </button>

            {/* Switch Camera Link Toggle */}
            {stream && (
              <button
                id="toggle_camera_btn"
                onClick={handleToggleCamera}
                className="flex items-center justify-center gap-1.5 text-stone-500 hover:text-stone-300 transition-colors text-[10px] tracking-wider uppercase font-mono py-1 cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
                <span>Switch Camera feed</span>
              </button>
            )}
          </div>
        </main>

        {/* Home Indicator mimicking premium hardware device */}
        <div className="w-28 h-1 bg-white/10 mx-auto mt-2 mb-4 rounded-full shrink-0 hidden sm:block" />
      </div>
    </div>
  );
}
