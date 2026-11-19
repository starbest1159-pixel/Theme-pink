import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  Subtitles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Episode, SeriesItem, SubtitleLang, VideoQuality } from '../types/series';
import { formatTime, getNextEpisode } from '../utils/catalogLogic';
import { ResilientImage } from './ResilientImage';

interface VideoPlayerViewProps {
  series: SeriesItem;
  episodeNumber: number;
  initialProgressSeconds?: number;
  defaultQuality: VideoQuality;
  defaultSubtitle: SubtitleLang;
  autoplayNext: boolean;
  onChangeEpisode: (episodeNumber: number) => void;
  onProgressUpdate: (episodeNumber: number, progressSeconds: number, durationSeconds: number) => void;
  onBackToDetail: () => void;
}

const SUBTITLE_SAMPLES: Record<SubtitleLang, string[]> = {
  TH: [
    'ยินดีต้อนรับสู่การเดินทางบทใหม่ในโลกของ Bannlai Series',
    'พลังที่แท้จริงเกิดจากความมุ่งมั่นที่จะปกป้องคนสำคัญ',
    'ท้องฟ้ายามบ่ายเต็มไปด้วยกลีบซากุระที่โปรยปราย...',
    'เตรียมพบกับจุดพลิกผันครั้งสำคัญในตอนต่อไป!',
  ],
  EN: [
    'Welcome to a brand new chapter on Bannlai Series.',
    'True strength comes from protecting what matters most.',
    'Cherry blossoms drift across the afternoon sky...',
    'Stay tuned for the turning point in the next scene!',
  ],
  OFF: [],
};

export function VideoPlayerView({
  series,
  episodeNumber,
  initialProgressSeconds = 0,
  defaultQuality,
  defaultSubtitle,
  autoplayNext,
  onChangeEpisode,
  onProgressUpdate,
  onBackToDetail,
}: VideoPlayerViewProps) {
  const episode: Episode =
    series.episodes.find((ep) => ep.number === episodeNumber) || series.episodes[0];
  const nextEpisode = getNextEpisode(series, episode.number);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(
    Math.min(initialProgressSeconds, Math.max(0, episode.durationSeconds - 5))
  );
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [quality, setQuality] = useState<VideoQuality>(defaultQuality);
  const [subtitle, setSubtitle] = useState<SubtitleLang>(defaultSubtitle);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [streamError, setStreamError] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const timeRef = useRef(currentTime);
  timeRef.current = currentTime;

  const hasLiveStream = Boolean(episode.streamUrl && !streamError);

  // Reset playback position when episode changes
  useEffect(() => {
    setStreamError(false);
    setCurrentTime(
      episode.number === episodeNumber && initialProgressSeconds > 0
        ? Math.min(initialProgressSeconds, Math.max(0, episode.durationSeconds - 5))
        : 0
    );
    setIsPlaying(true);
  }, [series.id, episode.number, episode.streamUrl]);

  // Sync HTML5 video element when a real stream URL is connected
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasLiveStream) return;
    video.muted = isMuted;
    video.volume = Math.max(0, Math.min(1, volume / 100));
    video.playbackRate = playbackRate;
    if (isPlaying) {
      video.play().catch(() => {
        // Autoplay may be blocked by browser policy until interaction
      });
    } else {
      video.pause();
    }
  }, [hasLiveStream, isPlaying, isMuted, volume, playbackRate]);

  // Preload scene backdrop image onto an offscreen Image for smooth canvas compositing
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = series.heroBanner || episode.thumbnail || series.poster;
    img.onload = () => {
      bgImageRef.current = img;
    };
  }, [series.id, series.heroBanner, series.poster, episode.thumbnail]);

  // Playback timer & watch history sync (canvas preview mode)
  useEffect(() => {
    if (!isPlaying || hasLiveStream) return;
    const interval = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + playbackRate * 0.5;
        if (next >= episode.durationSeconds) {
          if (autoplayNext && nextEpisode) {
            onChangeEpisode(nextEpisode.number);
            return 0;
          }
          setIsPlaying(false);
          return episode.durationSeconds;
        }
        return next;
      });
    }, 500);
    return () => window.clearInterval(interval);
  }, [isPlaying, hasLiveStream, playbackRate, episode.durationSeconds, autoplayNext, nextEpisode, onChangeEpisode]);

  // Record watch history on episode start and periodic progress
  useEffect(() => {
    onProgressUpdate(episode.number, Math.floor(timeRef.current), episode.durationSeconds);
  }, [series.id, episode.number]);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      onProgressUpdate(episode.number, Math.floor(timeRef.current), episode.durationSeconds);
    }, 5000);
    return () => {
      window.clearInterval(syncTimer);
      onProgressUpdate(episode.number, Math.floor(timeRef.current), episode.durationSeconds);
    };
  }, [series.id, episode.number, episode.durationSeconds]);

  // Animated Canvas Video Frame Renderer (renders rich animated anime/series scenes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let tick = 0;

    const particles = Array.from({ length: 28 }, (_, i) => ({
      x: (i * 137) % 960,
      y: (i * 89) % 540,
      vx: 0.4 + (i % 4) * 0.25,
      vy: 0.35 + (i % 3) * 0.2,
      size: 3 + (i % 5) * 1.4,
      angle: i * 0.7,
    }));

    const renderFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw ken-burns zoomed scene image
      const img = bgImageRef.current;
      const zoom = 1.03 + Math.sin(tick * 0.008) * 0.03;
      const panX = Math.sin(tick * 0.006) * 14;
      if (img) {
        const dw = w * zoom;
        const dh = h * zoom;
        ctx.drawImage(img, (w - dw) / 2 + panX, (h - dh) / 2, dw, dh);
      } else {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#4c0519');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Subtle sakura-rose atmospheric tint & soft vignette
      ctx.fillStyle = 'rgba(24, 8, 22, 0.24)';
      ctx.fillRect(0, 0, w, h);
      const roseGlow = ctx.createRadialGradient(w * 0.12, h * 0.14, 10, w * 0.12, h * 0.14, w * 0.55);
      roseGlow.addColorStop(0, 'rgba(255, 42, 122, 0.14)');
      roseGlow.addColorStop(1, 'rgba(255, 42, 122, 0)');
      ctx.fillStyle = roseGlow;
      ctx.fillRect(0, 0, w, h);

      // Theme-tailored floating particles with Bannlai sakura petals
      particles.forEach((p, idx) => {
        if (isPlaying) {
          p.x = (p.x + p.vx * playbackRate) % (w + 20);
          p.y = (p.y + p.vy * playbackRate) % (h + 20);
          p.angle += 0.02 * playbackRate;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (idx % 3 === 0 || series.sceneTheme === 'sakura' || series.sceneTheme === 'urban') {
          ctx.fillStyle = idx % 2 === 0 ? 'rgba(255, 182, 213, 0.85)' : 'rgba(255, 42, 122, 0.68)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (series.sceneTheme === 'shadow' || series.sceneTheme === 'wisteria') {
          ctx.fillStyle = idx % 2 === 0 ? 'rgba(167, 139, 250, 0.8)' : 'rgba(244, 63, 94, 0.75)';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(254, 240, 138, 0.55)';
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (isPlaying) {
        tick += playbackRate;
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isPlaying, playbackRate, series.sceneTheme, series.id, episode.number]);

  const toggleFullscreen = async () => {
    const el = playerContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
  };

  const cycleSubtitle = () => {
    const order: SubtitleLang[] = ['TH', 'EN', 'OFF'];
    const nextIdx = (order.indexOf(subtitle) + 1) % order.length;
    setSubtitle(order[nextIdx]);
  };

  const activeSubtitleLine =
    hasLiveStream || subtitle === 'OFF'
      ? ''
      : SUBTITLE_SAMPLES[subtitle][
          Math.floor(currentTime / 6) % SUBTITLE_SAMPLES[subtitle].length
        ];

  const progressPct = Math.min(
    100,
    Math.max(0, (currentTime / Math.max(1, episode.durationSeconds)) * 100)
  );

  return (
    <div className="w-full max-w-full overflow-x-clip space-y-2.5 sm:space-y-5">
      {/* Top Back Bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-rose-200/70 dark:border-rose-900/40 shadow-xs">
        <button
          type="button"
          onClick={onBackToDetail}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base font-bold text-slate-900 dark:text-white hover:text-[#FF1E6E] transition-colors cursor-pointer min-w-0"
        >
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-50 dark:bg-rose-950/60 text-[#FF1E6E] flex items-center justify-center shrink-0">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
          </span>
          <span className="truncate">
            {series.title} ตอนที่ {episode.number}
          </span>
        </button>

        <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-[#FF1E6E] dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/50 whitespace-nowrap shrink-0">
          {quality} · ซับ {subtitle === 'OFF' ? 'ปิด' : subtitle}
        </span>
      </div>

      {/* Main Player + Episode Sidebar Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-start w-full min-w-0">
        {/* Left: Video Stage + Below-Player Actions */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-2.5 sm:space-y-4 min-w-0 w-full">
          <div
            ref={playerContainerRef}
            data-testid="video-player-stage"
            data-playing={isPlaying ? 'true' : 'false'}
            className="relative aspect-video w-full max-w-full rounded-xl sm:rounded-2xl overflow-hidden bg-[#140712] shadow-lg shadow-rose-500/15 ring-1 ring-rose-300/60 dark:ring-rose-500/30 border border-rose-200/80 dark:border-rose-900/50 group"
          >
            {hasLiveStream ? (
              <video
                ref={videoRef}
                src={episode.streamUrl}
                poster={series.heroBanner || episode.thumbnail || series.poster}
                crossOrigin="anonymous"
                playsInline
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => {
                  if (autoplayNext && nextEpisode) {
                    onChangeEpisode(nextEpisode.number);
                  } else {
                    setIsPlaying(false);
                  }
                }}
                onError={() => setStreamError(true)}
                className="w-full h-full max-w-full object-cover block bg-black"
              >
                {subtitle !== 'OFF' &&
                  episode.subtitles?.map((track) => (
                    <track
                      key={`${track.language}-${track.url}`}
                      kind="subtitles"
                      src={track.url}
                      srcLang={track.language}
                      label={track.label}
                      default={
                        subtitle === 'TH'
                          ? track.language.toLowerCase().startsWith('th') || Boolean(track.isDefault)
                          : track.language.toLowerCase().startsWith('en')
                      }
                    />
                  ))}
              </video>
            ) : (
              <canvas
                ref={canvasRef}
                width={960}
                height={540}
                className="w-full h-full max-w-full object-cover block"
              />
            )}

            {/* Top-left Bannlai Series Theme Watermark on Video Stage */}
            <div
              data-testid="player-stage-watermark"
              aria-hidden="true"
              className="pointer-events-none select-none absolute top-2 left-2 sm:top-3 sm:left-3.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#1d0614]/45 backdrop-blur-[2px] border border-rose-300/25"
            >
              <img
                src="/assets/bannlai/01-logo-bannlai-nobg.png"
                alt=""
                className="h-4 sm:h-6 w-auto object-contain opacity-85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]"
              />
            </div>

            {/* Top-right speed pill */}
            <button
              type="button"
              onClick={cyclePlaybackRate}
              aria-label={`ความเร็วการเล่น ${playbackRate}x`}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-[#1d0614]/65 hover:bg-[#FF1E6E]/85 border border-rose-300/30 text-white text-[10px] sm:text-xs font-mono-tabular font-semibold backdrop-blur-sm transition-colors cursor-pointer"
            >
              {playbackRate.toFixed(playbackRate % 1 === 0 ? 1 : 2)}x
            </button>

            {/* Center Play/Pause Overlay */}
            {!isPlaying && (
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                aria-label="เล่นวิดีโอต่อ"
                className="absolute inset-0 m-auto w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#FF2A7A] to-[#E6005C] hover:brightness-110 text-white flex items-center justify-center shadow-2xl shadow-rose-600/40 ring-2 ring-white/40 cursor-pointer transition-transform hover:scale-105"
              >
                <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-current ml-0.5 sm:ml-1" aria-hidden="true" />
              </button>
            )}

            {/* Dynamic Subtitles */}
            {activeSubtitleLine && (
              <div
                aria-live="polite"
                className="absolute bottom-[60px] sm:bottom-20 inset-x-2.5 sm:inset-x-6 flex justify-center pointer-events-none"
              >
                <p className="px-2.5 sm:px-4 py-0.5 sm:py-1.5 rounded-md sm:rounded-lg bg-[#12040d]/90 border border-rose-300/35 text-white text-[10.5px] sm:text-sm md:text-base font-semibold leading-tight text-center max-w-full sm:max-w-2xl shadow-md">
                  {activeSubtitleLine}
                </p>
              </div>
            )}

            {/* Bottom Controls Bar — High-Contrast Frosted Dark Rose Deck */}
            <div className="absolute inset-x-0 bottom-0 bg-[#10040c]/90 backdrop-blur-md border-t border-rose-300/25 pt-1.5 sm:pt-2.5 pb-2 sm:pb-3 px-2 sm:px-5 space-y-1.5 sm:space-y-2">
              {/* Seek Slider */}
              <div className="flex items-center gap-2 sm:gap-3">
                <label htmlFor="video-seek-slider" className="sr-only">
                  แถบเลื่อนเวลาวิดีโอ
                </label>
                <div className="relative w-full h-2 flex items-center">
                  <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/30 overflow-hidden pointer-events-none">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF7EB3] via-[#FF2A7A] to-[#FF1E6E]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <input
                    id="video-seek-slider"
                    type="range"
                    min={0}
                    max={episode.durationSeconds}
                    value={currentTime}
                    onChange={(e) => {
                      const target = Number(e.target.value);
                      setCurrentTime(target);
                      if (videoRef.current && hasLiveStream) {
                        videoRef.current.currentTime = target;
                      }
                    }}
                    className="relative z-10 w-full h-3.5 sm:h-4 accent-[#FF2A7A] cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 sm:gap-2 text-white min-w-0">
                {/* Left Playback Controls */}
                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    aria-label={isPlaying ? 'หยุดชั่วคราว' : 'เล่น'}
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-[#FF1E6E] hover:bg-[#FF3A82] text-white shadow-sm shadow-rose-600/40 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" aria-hidden="true" />
                    ) : (
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = Math.max(0, currentTime - 10);
                      setCurrentTime(target);
                      if (videoRef.current && hasLiveStream) {
                        videoRef.current.currentTime = target;
                      }
                    }}
                    aria-label="ย้อนกลับ 10 วินาที"
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/14 hover:bg-rose-500/40 border border-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = Math.min(episode.durationSeconds, currentTime + 10);
                      setCurrentTime(target);
                      if (videoRef.current && hasLiveStream) {
                        videoRef.current.currentTime = target;
                      }
                    }}
                    aria-label="ข้ามไปข้างหน้า 10 วินาที"
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/14 hover:bg-rose-500/40 border border-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/14 hover:bg-rose-500/40 border border-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                    )}
                  </button>

                  <input
                    type="range"
                    aria-label="ระดับเสียง"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setVolume(val);
                      if (val > 0 && isMuted) setIsMuted(false);
                    }}
                    className="hidden sm:block w-16 h-1 accent-[#FF1E6E] cursor-pointer"
                  />

                  <span className="ml-0.5 sm:ml-1 text-[10.5px] sm:text-sm font-mono-tabular font-bold text-white whitespace-nowrap shrink-0">
                    {formatTime(currentTime)} / {episode.durationLabel}
                  </span>
                </div>

                {/* Right Utility Controls */}
                <div className="flex items-center gap-1 sm:gap-2 relative shrink-0">
                  <button
                    type="button"
                    onClick={cycleSubtitle}
                    aria-label={`เปลี่ยนซับไตเติล (ปัจจุบัน: ${subtitle})`}
                    className="w-7 h-7 sm:w-auto sm:h-9 sm:px-2.5 rounded-full sm:rounded-lg bg-white/14 hover:bg-rose-500/40 border border-white/20 text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Subtitles className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                    <span className="hidden sm:inline">{subtitle}</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowQualityMenu((v) => !v)}
                      aria-label="เลือกความคมชัด"
                      aria-expanded={showQualityMenu}
                      className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/14 hover:bg-rose-500/40 border border-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                    </button>

                    {showQualityMenu && (
                      <div className="absolute bottom-9 sm:bottom-11 right-0 w-32 sm:w-36 bg-[#1d0a18]/98 border border-rose-400/40 rounded-xl p-1.5 shadow-xl z-20">
                        {(['1080p HD', '720p', '480p'] as VideoQuality[]).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              setQuality(q);
                              setShowQualityMenu(false);
                            }}
                            className={`w-full text-left px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer ${
                              quality === q
                                ? 'bg-[#FF1E6E] text-white'
                                : 'text-rose-100 hover:bg-white/10'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? 'ออกจากเต็มหน้าจอ' : 'เต็มหน้าจอ'}
                    className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/14 hover:bg-rose-500/40 border border-white/20 text-white flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.25} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Episode Title & Action Row below player — styled with Bannlai sakura-rose theme & faded watermark */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white via-rose-50/75 to-pink-50/85 dark:from-slate-900 dark:via-rose-950/35 dark:to-slate-900 rounded-xl sm:rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-sm shadow-rose-200/40 dark:shadow-rose-950/30 p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 min-w-0">
            {/* Top sakura-rose accent hairline */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FF2A7A] via-[#FF85B3] to-[#FF2A7A]"
            />

            {/* Subtle Theme Banner & Logo Watermark inside card */}
            <div
              data-testid="player-card-watermark"
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 overflow-hidden"
            >
              <img
                src="/assets/aistudio/IMG_20261119_232237_1e5698f2.png"
                alt=""
                className="w-full h-full object-cover object-right opacity-[0.11] dark:opacity-[0.09]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-rose-50/55 dark:from-slate-900/95 dark:via-slate-900/80 dark:to-rose-950/55" />
              <img
                src="/assets/bannlai/01-logo-bannlai-nobg.png"
                alt=""
                className="absolute -right-2 -bottom-2 h-14 sm:h-18 w-auto object-contain opacity-[0.14] dark:opacity-[0.12]"
              />
            </div>

            <div className="relative z-10 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF1E6E] shrink-0" aria-hidden="true" />
                <span className="text-[10px] sm:text-xs font-bold text-[#FF1E6E] tracking-wide">
                  Bannlai Series · ตอนที่ {episode.number}
                </span>
              </div>
              <h1 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {series.title} {episode.title}
              </h1>
              <p className="text-[11px] sm:text-sm text-slate-700 dark:text-rose-100/80 mt-0.5 line-clamp-2 leading-snug">
                {episode.summary}
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-2 shrink-0 flex-wrap">
              {nextEpisode && (
                <button
                  type="button"
                  onClick={() => onChangeEpisode(nextEpisode.number)}
                  className="h-8 sm:h-10 px-3 sm:px-4 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-110 text-white text-[11px] sm:text-sm font-bold shadow-sm shadow-rose-500/30 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>ถัดไปตอน {nextEpisode.number}</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const order: VideoQuality[] = ['1080p HD', '720p', '480p'];
                  const next = order[(order.indexOf(quality) + 1) % order.length];
                  setQuality(next);
                }}
                className="h-8 sm:h-10 px-3 sm:px-4 rounded-full bg-white/90 dark:bg-slate-800/90 border border-rose-200/80 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-200 text-[11px] sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                <span>{quality}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Episode List Sidebar */}
        <aside
          aria-label="รายการตอน"
          className="relative overflow-hidden lg:col-span-4 xl:col-span-3 min-w-0 w-full bg-gradient-to-b from-white via-white to-rose-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/25 rounded-xl sm:rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-sm shadow-rose-200/30 dark:shadow-none p-3 sm:p-4"
        >
          {/* Faint corner theme watermark in sidebar */}
          <img
            src="/assets/bannlai/01-logo-bannlai-nobg.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none absolute -right-3 -bottom-2 h-14 w-auto object-contain opacity-[0.08]"
          />

          <div className="relative z-10 flex items-center justify-between mb-2.5 sm:mb-3">
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#FF2A7A] to-[#FF85B3]" aria-hidden="true" />
              รายการตอน
            </h2>
            <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-[#FF1E6E] tabular-nums">
              {series.episodes.length} ตอน
            </span>
          </div>

          <div className="relative z-10 space-y-1.5 sm:space-y-2 max-h-[320px] sm:max-h-[460px] overflow-y-auto pr-0.5 sm:pr-1">
            {series.episodes.map((ep) => {
              const active = ep.number === episode.number;
              return (
                <button
                  key={ep.number}
                  type="button"
                  onClick={() => onChangeEpisode(ep.number)}
                  aria-current={active ? 'true' : undefined}
                  className={`w-full flex items-center gap-2.5 sm:gap-3 p-1.5 sm:p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-rose-50 to-pink-50/90 dark:from-rose-950/60 dark:to-pink-950/30 border-[#FF1E6E] shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800/50 border-rose-100/60 dark:border-transparent hover:border-rose-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="relative w-16 h-10 sm:w-20 sm:h-12 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700">
                    <ResilientImage
                      src={ep.thumbnail}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-bold truncate ${
                        active
                          ? 'text-[#FF1E6E]'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      ตอนที่ {ep.number}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {ep.durationLabel}
                    </p>
                  </div>
                  {active && (
                    <Play
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF1E6E] fill-current shrink-0 mr-1"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
