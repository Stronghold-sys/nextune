import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX, ListMusic, Clock, Gauge, ChevronUp, ChevronDown, Heart, Plus, ListCollapse } from 'lucide-react'
import { usePlayerStore } from '../../store/usePlayerStore'
import { useAuthStore } from '../../store/useAuthStore'
import { supabase } from '../../supabaseClient'

export default function MusicPlayer() {
  const { user } = useAuthStore()
  const {
    currentSong, isPlaying, progress, duration, volume, playbackSpeed, repeatMode, shuffle, sleepTimer, lyrics, loadingStream,
    togglePlay, next, prev, seek, setVolume, setPlaybackSpeed, setRepeatMode, setShuffle, setSleepTimer, queue, removeFromQueue
  } = usePlayerStore()

  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(0.8)
  const [isQueueOpen, setIsQueueOpen] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showSleepMenu, setShowSleepMenu] = useState(false)

  const activeLyricRef = useRef(null)

  // Sync scroll for lyrics
  useEffect(() => {
    if (activeLyricRef.current) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [progress])

  // Check if current song is in favorites
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user || !currentSong) return
      try {
        const { data } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('song_id', currentSong.id)
          .maybeSingle()
        setIsFavorited(!!data)
      } catch (e) {
        setIsFavorited(false)
      }
    }
    checkFavorite()
  }, [currentSong, user])

  if (!currentSong) return null

  const handleToggleFavorite = async (e) => {
    e.stopPropagation()
    if (!user) return alert("Silakan masuk untuk menyukai lagu")
    try {
      if (isFavorited) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('song_id', currentSong.id)
        setIsFavorited(false)
      } else {
        // First ensure the song metadata is in our songs table if it came from YouTube
        let songId = currentSong.id
        if (currentSong.is_youtube || currentSong.videoId) {
          const videoId = currentSong.videoId || currentSong.id
          const { data: existingSong } = await supabase
            .from('songs')
            .select('id')
            .eq('video_id', videoId)
            .maybeSingle()
          
          if (existingSong) {
            songId = existingSong.id
          } else {
            const { data: newSong } = await supabase
              .from('songs')
              .insert({
                title: currentSong.title,
                artist: currentSong.artist,
                cover_url: currentSong.coverUrl || currentSong.cover_url,
                video_id: videoId,
                is_youtube: true,
                status: 'public'
              })
              .select()
              .single()
            songId = newSong.id
          }
        }

        await supabase.from('favorites').insert({ user_id: user.id, song_id: songId })
        setIsFavorited(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00"
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const currentCover = currentSong.coverUrl || currentSong.cover_url

  return (
    <>
      {/* 1. PERSISTENT MINI PLAYER BAR (Desktop Bottom, Mobile Anchor) */}
      <div 
        onClick={() => setIsMobileExpanded(true)}
        className="fixed bottom-[60px] sm:bottom-0 left-0 right-0 h-16 sm:h-20 bg-background-player/95 border-t border-gray-border/60 backdrop-blur-lg z-40 px-4 sm:px-6 flex items-center justify-between cursor-pointer sm:cursor-default shadow-2xl select-none"
      >
        {/* Cover Art and Metadata */}
        <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
          <img 
            src={currentCover} 
            alt={currentSong.title} 
            className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg object-cover border border-gray-border/50 shrink-0 ${isPlaying ? 'animate-pulse' : ''}`} 
          />
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[150px] sm:max-w-[200px]">
              {currentSong.title}
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-text truncate mt-0.5 max-w-[150px] sm:max-w-[200px]">
              {currentSong.artist}
            </p>
          </div>
          <button 
            onClick={handleToggleFavorite}
            className="p-1 hover:text-white"
          >
            <Heart className={`w-4 h-4 shrink-0 transition-all ${isFavorited ? 'text-accent fill-accent scale-110' : 'text-gray-muted'}`} />
          </button>
        </div>

        {/* Desktop Central Playing Controls */}
        <div className="hidden sm:flex flex-col items-center flex-1 max-w-xl px-4 space-y-1.5">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShuffle(!shuffle)}
              className={`p-1.5 transition-colors ${shuffle ? 'text-primary' : 'text-gray-muted hover:text-white'}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={prev} className="p-1.5 text-gray-muted hover:text-white transition-colors">
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={next} className="p-1.5 text-gray-muted hover:text-white transition-colors">
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
              className={`p-1.5 transition-colors ${repeatMode !== 'off' ? 'text-primary' : 'text-gray-muted hover:text-white'}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && <span className="absolute text-[8px] font-extrabold translate-x-3 -translate-y-2 bg-primary text-white rounded-full px-1">1</span>}
            </button>
          </div>

          {/* Seekable Progress Slider */}
          <div className="w-full flex items-center gap-3 text-[10px] text-gray-text font-mono">
            <span>{formatTime(progress)}</span>
            <input 
              type="range" 
              min="0"
              max={duration || 100}
              value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mobile controls (Mini Player view) */}
        <div className="flex sm:hidden items-center gap-3 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black"
          >
            {isPlaying ? <Pause className="w-4.5 h-4.5 fill-current" /> : <Play className="w-4.5 h-4.5 fill-current ml-0.5" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="text-gray-text hover:text-white"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
        </div>

        {/* Desktop Right Panel (Volume & Extra features) */}
        <div className="hidden sm:flex items-center gap-4 text-gray-muted shrink-0">
          {/* Playback Speed selector */}
          <div className="relative">
            <button 
              onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
              className="p-1 hover:text-white"
              title="Kecepatan Putar"
            >
              <Gauge className="w-4 h-4" />
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-background-card border border-gray-border rounded-lg p-1.5 shadow-xl text-xs space-y-1 w-20 z-50">
                {[0.5, 1, 1.5, 2].map(speed => (
                  <button 
                    key={speed}
                    onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }}
                    className={`w-full text-center py-1 rounded hover:bg-background-hover ${playbackSpeed === speed ? 'text-primary font-bold' : 'text-white'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sleep Timer selector */}
          <div className="relative">
            <button 
              onClick={() => setShowSleepMenu(!showSleepMenu)} 
              className="p-1 hover:text-white"
              title="Sleep Timer"
            >
              <Clock className="w-4 h-4" />
              {sleepTimer !== null && <span className="absolute text-[8px] bg-accent text-white rounded-full px-0.5 -top-1 -right-1 font-bold">{sleepTimer}m</span>}
            </button>
            {showSleepMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-background-card border border-gray-border rounded-lg p-1.5 shadow-xl text-xs space-y-1 w-24 z-50">
                <button 
                  onClick={() => { setSleepTimer(null); setShowSleepMenu(false); }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-background-hover text-accent"
                >
                  Matikan
                </button>
                {[5, 15, 30, 60].map(mins => (
                  <button 
                    key={mins}
                    onClick={() => { setSleepTimer(mins); setShowSleepMenu(false); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-background-hover text-white"
                  >
                    {mins} Menit
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Queue Overlay Button */}
          <button 
            onClick={() => setIsQueueOpen(!isQueueOpen)} 
            className={`p-1 ${isQueueOpen ? 'text-primary' : 'hover:text-white'}`}
            title="Antrean Lagu"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume seek bar */}
          <div className="flex items-center gap-2">
            <button onClick={handleToggleMute} className="hover:text-white">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-gray-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. FULLSCREEN EXPANDED MOBILE PLAYER */}
      <AnimatePresence>
        {isMobileExpanded && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-0 bg-background z-50 flex flex-col justify-between p-6 overflow-hidden select-none sm:hidden"
          >
            {/* Blurry Album Art Background Layer */}
            <div className="absolute inset-0 z-0 opacity-20 filter blur-3xl pointer-events-none scale-125">
              <img src={currentCover} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Header: Collapse button and titles */}
            <div className="flex items-center justify-between z-10">
              <button 
                onClick={() => setIsMobileExpanded(false)}
                className="p-1 hover:text-white text-gray-text"
              >
                <ChevronDown className="w-7 h-7" />
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-text">Sedang Diputar</span>
              <button 
                onClick={() => setIsQueueOpen(!isQueueOpen)} 
                className="p-1 text-gray-text"
              >
                <ListMusic className="w-6 h-6" />
              </button>
            </div>

            {/* Album Cover Display */}
            <div className="flex-1 flex flex-col justify-center items-center py-6 z-10">
              <motion.div 
                layoutId="expanded-cover"
                className="w-56 h-56 rounded-2xl overflow-hidden shadow-2xl border border-gray-border/50 relative"
              >
                <img src={currentCover} alt={currentSong.title} className="w-full h-full object-cover" />
              </motion.div>
            </div>

            {/* Metadata (Title / Artist) and Sync Lyrics Box */}
            <div className="space-y-4 z-10 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">{currentSong.title}</h2>
                  <p className="text-sm text-gray-text mt-0.5">{currentSong.artist}</p>
                </div>
                <button onClick={handleToggleFavorite} className="p-1">
                  <Heart className={`w-6 h-6 ${isFavorited ? 'text-accent fill-accent' : 'text-gray-text'}`} />
                </button>
              </div>

              {/* Synchronized Lyrics Container (Scroll Box) */}
              <div className="h-28 overflow-y-auto no-scrollbar mask-gradient flex flex-col py-2 border-t border-b border-gray-border/20 text-center font-medium">
                {lyrics.map((line, idx) => {
                  const isActive = progress >= line.time && (idx === lyrics.length - 1 || progress < lyrics[idx + 1].time)
                  return (
                    <p
                      key={idx}
                      ref={isActive ? activeLyricRef : null}
                      className={`text-xs py-1 transition-all duration-300 ${isActive ? 'text-primary-light font-extrabold text-sm scale-105' : 'text-gray-muted'}`}
                    >
                      {line.text}
                    </p>
                  )
                })}
              </div>
            </div>

            {/* Audio Seek and Timeline */}
            <div className="space-y-2 z-10 pt-4">
              <div className="w-full flex items-center gap-3 text-[10px] text-gray-text font-mono">
                <span>{formatTime(progress)}</span>
                <input 
                  type="range" 
                  min="0"
                  max={duration || 100}
                  value={progress}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main playback control row */}
            <div className="flex items-center justify-between z-10 py-4 px-2">
              <button 
                onClick={() => setShuffle(!shuffle)}
                className={`p-1.5 transition-colors ${shuffle ? 'text-primary' : 'text-gray-text'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button onClick={prev} className="p-1.5 text-white">
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              <button 
                onClick={togglePlay} 
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black shadow-lg shadow-white/10 active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
              </button>
              <button onClick={next} className="p-1.5 text-white">
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
              <button 
                onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
                className={`p-1.5 transition-colors ${repeatMode !== 'off' ? 'text-primary' : 'text-gray-text'}`}
              >
                <Repeat className="w-5 h-5" />
              </button>
            </div>

            {/* Speed & sleep controls on mobile footer */}
            <div className="flex justify-around items-center z-10 text-xs text-gray-text pt-2 border-t border-gray-border/20">
              <button onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1)}>
                Kec: <span className="font-bold text-white">{playbackSpeed}x</span>
              </button>
              <button onClick={() => setSleepTimer(sleepTimer === null ? 15 : sleepTimer === 15 ? 30 : sleepTimer === 30 ? 60 : null)}>
                Timer: <span className="font-bold text-white">{sleepTimer ? `${sleepTimer}m` : 'Mati'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. SIDE PANEL QUEUE LIST OVERLAY */}
      <AnimatePresence>
        {isQueueOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsQueueOpen(false)}></div>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ y: 0, x: 0 }}
              exit={{ x: "100%" }}
              className="relative w-full max-w-sm h-full bg-background-card border-l border-gray-border p-5 shadow-2xl flex flex-col justify-between z-10"
            >
              <div className="space-y-4 overflow-y-auto no-scrollbar flex-1">
                <div className="flex items-center justify-between pb-3 border-b border-gray-border/50">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <ListMusic className="w-5 h-5 text-primary" /> Antrean Lagu
                  </h3>
                  <button onClick={() => setIsQueueOpen(false)} className="text-gray-text hover:text-white">
                    <ListCollapse className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {queue.length === 0 ? (
                    <p className="text-xs text-gray-muted text-center py-10">Antrean kosong.</p>
                  ) : (
                    queue.map((song, idx) => {
                      const isCurrent = (song.id || song.videoId) === (currentSong.id || currentSong.videoId)
                      return (
                        <div 
                          key={song.id || idx}
                          className={`flex items-center justify-between p-2 rounded-xl border border-gray-border/30 hover:bg-background-hover transition-colors ${isCurrent ? 'bg-primary/10 border-primary/40' : ''}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] text-gray-muted font-mono w-4 text-center">{idx + 1}</span>
                            <img src={song.coverUrl || song.cover_url} alt="" className="w-8 h-8 rounded-md object-cover" />
                            <div className="min-w-0">
                              <h4 className={`text-xs font-semibold truncate max-w-[150px] ${isCurrent ? 'text-primary-light' : 'text-white'}`}>{song.title}</h4>
                              <p className="text-[10px] text-gray-text truncate mt-0.5">{song.artist}</p>
                            </div>
                          </div>
                          {!isCurrent && (
                            <button 
                              onClick={() => removeFromQueue(song.id || song.videoId)}
                              className="text-gray-muted hover:text-accent p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

// Re-expose Trash2 internally
function Trash2(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
