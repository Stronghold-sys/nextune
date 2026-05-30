import { create } from 'zustand'
import { useAuthStore } from './useAuthStore'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

// Global HTML5 Audio instance for custom uploads
let globalAudio = new Audio()

// Web Audio API Global Instance Holders
let audioCtx = null
let sourceNode = null
let filterNode = null
let monoGainNode = null

function initWebAudio() {
  if (typeof window === 'undefined') return
  if (audioCtx) return

  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  try {
    audioCtx = new AudioContext()
    globalAudio.crossOrigin = "anonymous"
    sourceNode = audioCtx.createMediaElementSource(globalAudio)
    
    filterNode = audioCtx.createBiquadFilter()
    filterNode.type = 'allpass'
    
    monoGainNode = audioCtx.createGain()
    monoGainNode.channelCount = 1
    monoGainNode.channelCountMode = 'explicit'
  } catch (err) {
    console.warn("Web Audio API not fully supported or restricted by browser:", err)
  }
}

function updateAudioEffects(quality, mode) {
  try {
    initWebAudio()
    if (!audioCtx || !sourceNode) return

    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    try {
      sourceNode.disconnect()
      filterNode.disconnect()
      monoGainNode.disconnect()
    } catch {
      // ignore
    }

    // Apply Sound Mode Filter (EQ Character)
    if (mode === 'low') {
      filterNode.type = 'lowpass'
      filterNode.frequency.value = 1000 // Cut high frequencies for rich bass/warmth
    } else if (mode === 'high') {
      filterNode.type = 'highpass'
      filterNode.frequency.value = 2000 // Cut low frequencies for bright treble/vocals
    } else {
      filterNode.type = 'allpass' // Flat / original dynamic Hi-Fi sound
    }

    // Apply Audio Quality (Mono downmix vs Stereo bypass)
    if (quality === 'mono') {
      sourceNode.connect(filterNode)
      filterNode.connect(monoGainNode)
      monoGainNode.connect(audioCtx.destination)
    } else {
      sourceNode.connect(filterNode)
      filterNode.connect(audioCtx.destination)
    }
  } catch (err) {
    console.warn("Failed to apply Web Audio effects, falling back to direct speaker output:", err)
  }
}

// YouTube Player state holders
let ytPlayer = null
let ytProgressInterval = null
let isYtReady = false

// Load YouTube IFrame API
if (typeof window !== 'undefined') {
  // Save previous callback if any
  const prevCallback = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    if (prevCallback) prevCallback()
    initYouTubePlayer()
  }

  // Check if script is already loaded and ready
  if (window.YT && window.YT.Player) {
    setTimeout(initYouTubePlayer, 100)
  } else {
    // Inject script if not already present
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }
  }
}

function initYouTubePlayer() {
  if (ytPlayer) return

  let placeholder = document.getElementById('yt-player-placeholder')
  if (!placeholder) {
    placeholder = document.createElement('div')
    placeholder.id = 'yt-player-placeholder'
    // Position off-screen but with a non-zero size to prevent browser throttling/suspension of hidden iframes
    placeholder.style.position = 'fixed'
    placeholder.style.left = '-9999px'
    placeholder.style.top = '-9999px'
    placeholder.style.width = '200px'
    placeholder.style.height = '200px'
    placeholder.style.opacity = '0.01'
    placeholder.style.pointerEvents = 'none'
    placeholder.style.zIndex = '-9999'
    document.body.appendChild(placeholder)
  }

  try {
    ytPlayer = new window.YT.Player('yt-player-placeholder', {
      height: '200',
      width: '200',
      videoId: '',
      playerVars: {
        'playsinline': 1,
        'controls': 0,
        'disablekb': 1,
        'fs': 0,
        'rel': 0,
        'showinfo': 0,
        'iv_load_policy': 3
      },
      events: {
        'onReady': () => {
          isYtReady = true
        },
        'onStateChange': (event) => {
          const store = usePlayerStore.getState()
          if (event.data === window.YT.PlayerState.ENDED) {
            stopYtProgressTimer()
            if (store.repeatMode === 'one') {
              ytPlayer.seekTo(0)
              ytPlayer.playVideo()
            } else {
              store.next()
            }
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            usePlayerStore.setState({ isPlaying: true, loadingStream: false })
            startYtProgressTimer()
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            usePlayerStore.setState({ isPlaying: false })
            stopYtProgressTimer()
          } else if (event.data === window.YT.PlayerState.BUFFERING) {
            usePlayerStore.setState({ loadingStream: true })
          }
        },
        'onError': (e) => {
          console.error("YouTube Player Error:", e)
          usePlayerStore.setState({ isPlaying: false, loadingStream: false })
          
          let errorMsg = "Gagal memutar lagu dari YouTube. Silakan coba lagi."
          if (e.data === 2) errorMsg = "Video ID tidak valid."
          if (e.data === 5) errorMsg = "Pemutaran tidak didukung di pemutar tersemat."
          if (e.data === 100) errorMsg = "Video tidak ditemukan atau telah dihapus."
          if (e.data === 101 || e.data === 150) errorMsg = "Pemilik video tidak mengizinkan pemutaran di aplikasi lain."
          
          alert(errorMsg)
        }
      }
    })
  } catch (err) {
    console.error("Error creating YT.Player:", err)
  }
}

function startYtProgressTimer() {
  if (ytProgressInterval) clearInterval(ytProgressInterval)
  ytProgressInterval = setInterval(() => {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return
    try {
      const currentTime = ytPlayer.getCurrentTime()
      const duration = ytPlayer.getDuration() || 0
      
      const profile = useAuthStore.getState().profile
      const isPremium = profile && (
        ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role) ||
        (profile.premium_until && new Date(profile.premium_until) > new Date())
      )

      if (!isPremium && currentTime >= 30) {
        ytPlayer.pauseVideo()
        ytPlayer.seekTo(0)
        usePlayerStore.setState({ isPlaying: false, progress: 0 })
        window.dispatchEvent(new CustomEvent('premium-required', { detail: { reason: '30s_limit' } }))
      } else {
        usePlayerStore.setState({ progress: currentTime, duration })
      }
    } catch (e) {
      console.error("Progress timer error:", e)
    }
  }, 250)
}

function stopYtProgressTimer() {
  if (ytProgressInterval) {
    clearInterval(ytProgressInterval)
    ytProgressInterval = null
  }
}

export const usePlayerStore = create((set, get) => {
  // Update state with audio element progress and enforce 30s limit for non-premium
  globalAudio.addEventListener('timeupdate', () => {
    const profile = useAuthStore.getState().profile
    const isPremium = profile && (
      ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role) ||
      (profile.premium_until && new Date(profile.premium_until) > new Date())
    )

    if (!isPremium && globalAudio.currentTime >= 30) {
      globalAudio.pause()
      globalAudio.currentTime = 0
      set({ isPlaying: false, progress: 0 })
      window.dispatchEvent(new CustomEvent('premium-required', { detail: { reason: '30s_limit' } }))
    } else {
      set({ progress: globalAudio.currentTime })
    }
  })

  globalAudio.addEventListener('durationchange', () => {
    set({ duration: globalAudio.duration || 0 })
  })

  globalAudio.addEventListener('ended', () => {
    const { repeatMode, next } = get()
    if (repeatMode === 'one') {
      globalAudio.currentTime = 0
      globalAudio.play().catch(err => console.log("Playback error:", err))
    } else {
      next()
    }
  })

  // Periodical check for Sleep Timer
  let sleepInterval = null

  return {
    currentSong: null,
    isPlaying: false,
    queue: [],
    originalQueue: [], // Kept for un-shuffling
    currentIndex: -1,
    volume: 0.8,
    progress: 0,
    duration: 0,
    playbackSpeed: 1,
    repeatMode: 'off', // 'off' | 'all' | 'one'
    shuffle: false,
    sleepTimer: null, // Menit tersisa
    lyrics: [],
    isLyricsSynced: false,
    loadingStream: false,
    activePlayer: 'audio', // 'audio' | 'youtube'
    audioQuality: localStorage.getItem('audio_quality') || 'mono',
    soundMode: localStorage.getItem('sound_mode') || 'hifi',

    initAudio: () => {
      globalAudio.volume = get().volume
      globalAudio.playbackRate = get().playbackSpeed
      initYouTubePlayer()
    },

    playSong: async (song, newQueue = null) => {
      const { isPlaying, activePlayer } = get()
      
      // Stop currently playing
      if (isPlaying) {
        if (activePlayer === 'audio') {
          globalAudio.pause()
        } else if (activePlayer === 'youtube' && ytPlayer && isYtReady) {
          try {
            ytPlayer.pauseVideo()
          } catch (e) { console.warn(e) }
        }
      }
      stopYtProgressTimer()

      set({ currentSong: song, progress: 0, duration: 0, loadingStream: true, isPlaying: false })

      let audioUrl = song.audioUrl || song.audio_url
      const isYoutubeSong = song.is_youtube || song.videoId || (song.id && !audioUrl)

      // Handle custom queues
      if (newQueue) {
        const idx = newQueue.findIndex(s => (s.id || s.videoId) === (song.id || song.videoId))
        set({ 
          queue: [...newQueue], 
          originalQueue: [...newQueue],
          currentIndex: idx !== -1 ? idx : 0 
        })
      }

      if (isYoutubeSong) {
        set({ activePlayer: 'audio' })
        const videoId = song.videoId || song.id
        
        try {
          const response = await fetch(`${MUSIC_SERVICE_URL}/stream/${videoId}`)
          const data = await response.json()
          if (!response.ok || !data.streamUrl) {
            throw new Error(data.error || 'Gagal mengekstrak URL audio YouTube.')
          }
          audioUrl = data.streamUrl
        } catch (error) {
          console.warn("YouTube play error (attempting client-side fallback):", error)
          
          if (ytPlayer && isYtReady) {
            try {
              // Pause and clear global HTML5 audio player
              globalAudio.pause()
              globalAudio.src = ""
              
              // Load video in YouTube player
              ytPlayer.cueVideoById({ videoId })
              ytPlayer.playVideo()
              
              // Apply volume and playback settings
              ytPlayer.setVolume(get().volume * 100)
              if (typeof ytPlayer.setPlaybackRate === 'function') {
                ytPlayer.setPlaybackRate(get().playbackSpeed)
              }
              
              set({ activePlayer: 'youtube', loadingStream: false, isPlaying: true })
              get().loadLyrics(song)
              return
            } catch (ytErr) {
              console.error("YouTube Player fallback failed:", ytErr)
            }
          }
          
          set({ isPlaying: false, loadingStream: false })
          const msg = error.message?.includes('bot') || error.message?.includes('Sign in')
            ? 'Lagu tidak dapat diputar saat ini karena deteksi bot YouTube. Coba lagi sebentar atau pilih lagu lain.'
            : 'Gagal memutar lagu. Silakan coba lagi.'
          alert(msg)
          return
        }
      } else {
        set({ activePlayer: 'audio' })
      }

      if (!audioUrl) {
        set({ loadingStream: false })
        alert("Audio URL tidak valid.")
        return
      }

      try {
        globalAudio.src = audioUrl
        globalAudio.load()
        globalAudio.volume = get().volume
        globalAudio.playbackRate = get().playbackSpeed
        
        // Apply Web Audio quality & mode settings
        updateAudioEffects(get().audioQuality, get().soundMode)
        
        await globalAudio.play()
        set({ isPlaying: true, loadingStream: false })
        
        get().loadLyrics(song)
      } catch (error) {
        console.error("Audio play error:", error)
        set({ isPlaying: false, loadingStream: false })
      }
    },

    togglePlay: () => {
      const { isPlaying, currentSong, activePlayer } = get()
      if (!currentSong) return

      if (isPlaying) {
        if (activePlayer === 'audio') {
          globalAudio.pause()
        } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
          ytPlayer.pauseVideo()
        }
        set({ isPlaying: false })
      } else {
        if (activePlayer === 'audio') {
          globalAudio.play().catch(err => console.log("Audio toggle error:", err))
        } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.playVideo === 'function') {
          ytPlayer.playVideo()
        }
        set({ isPlaying: true })
      }
    },

    next: () => {
      const { queue, currentIndex, repeatMode, activePlayer } = get()
      if (queue.length === 0) return

      let nextIndex = currentIndex + 1
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0
        } else {
          // stop playing
          if (activePlayer === 'audio') {
            globalAudio.pause()
          } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
            ytPlayer.pauseVideo()
          }
          set({ isPlaying: false, progress: 0 })
          return
        }
      }

      set({ currentIndex: nextIndex })
      get().playSong(queue[nextIndex])
    },

    prev: () => {
      const { queue, currentIndex, progress, activePlayer } = get()
      if (queue.length === 0) return

      // If playing has progressed past 3s, restart song
      if (progress > 3) {
        if (activePlayer === 'audio') {
          globalAudio.currentTime = 0
        } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.seekTo === 'function') {
          ytPlayer.seekTo(0, true)
        }
        set({ progress: 0 })
        return
      }

      let prevIndex = currentIndex - 1
      if (prevIndex < 0) {
        prevIndex = queue.length - 1
      }

      set({ currentIndex: prevIndex })
      get().playSong(queue[prevIndex])
    },

    seek: (time) => {
      const { activePlayer } = get()
      const profile = useAuthStore.getState().profile
      const isPremium = profile && (
        ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role) ||
        (profile.premium_until && new Date(profile.premium_until) > new Date())
      )
      if (!isPremium && time >= 30) {
        if (activePlayer === 'audio') {
          globalAudio.currentTime = 29.9
        } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.seekTo === 'function') {
          ytPlayer.seekTo(29.9, true)
        }
        set({ progress: 29.9 })
        window.dispatchEvent(new CustomEvent('premium-required', { detail: { reason: '30s_limit' } }))
        return
      }

      if (activePlayer === 'audio') {
        globalAudio.currentTime = time
      } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.seekTo === 'function') {
        ytPlayer.seekTo(time, true)
      }
      set({ progress: time })
    },

    setVolume: (vol) => {
      const { activePlayer } = get()
      const v = Math.max(0, Math.min(1, vol))
      if (activePlayer === 'audio') {
        globalAudio.volume = v
      } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.setVolume === 'function') {
        ytPlayer.setVolume(v * 100)
      }
      set({ volume: v })
    },

    setPlaybackSpeed: (speed) => {
      const { activePlayer } = get()
      if (speed !== 1) {
        const profile = useAuthStore.getState().profile
        const isPremium = profile && (
          ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role) ||
          (profile.premium_until && new Date(profile.premium_until) > new Date())
        )
        if (!isPremium) {
          window.dispatchEvent(new CustomEvent('premium-required', { detail: { reason: 'playback_speed' } }))
          return
        }
      }
      if (activePlayer === 'audio') {
        globalAudio.playbackRate = speed
      } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') {
        ytPlayer.setPlaybackRate(speed)
      }
      set({ playbackSpeed: speed })
    },

    setRepeatMode: (mode) => {
      set({ repeatMode: mode })
    },

    setShuffle: (shouldShuffle) => {
      const { queue, currentSong, originalQueue } = get()
      if (queue.length === 0) {
        set({ shuffle: shouldShuffle })
        return
      }

      let newQueue = [...queue]
      if (shouldShuffle) {
        // Keep original queue for un-shuffle
        const currentIdx = queue.findIndex(s => (s.id || s.videoId) === (currentSong?.id || currentSong?.videoId))
        
        // Shuffle everything except current song
        const toShuffle = newQueue.filter((_, i) => i !== currentIdx)
        for (let i = toShuffle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]]
        }
        
        // Re-insert current song at index 0
        newQueue = currentSong ? [currentSong, ...toShuffle] : toShuffle
        set({ queue: newQueue, currentIndex: 0, shuffle: true })
      } else {
        // Restore original queue order
        const origIdx = originalQueue.findIndex(s => (s.id || s.videoId) === (currentSong?.id || currentSong?.videoId))
        set({ queue: [...originalQueue], currentIndex: origIdx !== -1 ? origIdx : 0, shuffle: false })
      }
    },

    addToQueue: (song) => {
      const { queue } = get()
      const exists = queue.some(s => (s.id || s.videoId) === (song.id || song.videoId))
      if (exists) return

      set({ 
        queue: [...queue, song],
        originalQueue: [...get().originalQueue, song]
      })
    },

    setQueue: (songs) => {
      set({ queue: [...songs], originalQueue: [...songs], currentIndex: 0 })
    },

    removeFromQueue: (songId) => {
      const { queue, currentSong } = get()
      const newQueue = queue.filter(s => (s.id || s.videoId) !== songId)
      
      let newIdx = newQueue.findIndex(s => (s.id || s.videoId) === (currentSong?.id || currentSong?.videoId))
      
      set({
        queue: newQueue,
        originalQueue: get().originalQueue.filter(s => (s.id || s.videoId) !== songId),
        currentIndex: newIdx
      })
    },

    setSleepTimer: (minutes) => {
      if (minutes === null) {
        if (sleepInterval) clearInterval(sleepInterval)
        set({ sleepTimer: null })
        return
      }

      const profile = useAuthStore.getState().profile
      const isPremium = profile && (
        ['admin', 'super_admin', 'content_admin', 'moderation_admin', 'finance_admin'].includes(profile.role) ||
        (profile.premium_until && new Date(profile.premium_until) > new Date())
      )
      if (!isPremium) {
        window.dispatchEvent(new CustomEvent('premium-required', { detail: { reason: 'sleep_timer' } }))
        return
      }

      if (sleepInterval) clearInterval(sleepInterval)
      set({ sleepTimer: minutes })
      
      sleepInterval = setInterval(() => {
        const { sleepTimer, togglePlay } = get()
        if (sleepTimer === null) {
          clearInterval(sleepInterval)
          return
        }

        if (sleepTimer <= 1) {
          clearInterval(sleepInterval)
          set({ sleepTimer: null })
          togglePlay()
        } else {
          set({ sleepTimer: sleepTimer - 1 })
        }
      }, 60000)
    },

    loadLyrics: async (song) => {
      const title = song.title || "Lagu"
      const artist = song.artist || "Artis"
      
      const mockLyrics = [
        { time: 0, text: `[Musik - ${title} oleh ${artist}]` },
        { time: 5, text: "Selamat datang di NexTune Streaming" },
        { time: 12, text: "Melodi indah mengalir tanpa henti" },
        { time: 20, text: "Dalam malam sunyi yang bersemi" },
        { time: 28, text: "Musik menghubungkan rasa kita bersama" },
        { time: 38, text: "Terbang melintasi batas samudera" },
        { time: 48, text: "Menikmati setiap ketukan dan irama" },
        { time: 58, text: "NexTune membawa damai dalam jiwa" },
        { time: 70, text: "[Melodi Gitar Interlude]" },
        { time: 88, text: "Dan ketika lagu ini berakhir nanti" },
        { time: 95, text: "Kenangan manis akan abadi di hati" },
        { time: 105, text: "Terima kasih telah mendengarkan" },
        { time: 115, text: "[Outro - NexTune]" }
      ]

      set({ lyrics: mockLyrics, isLyricsSynced: true })
    },

    setAudioQuality: (quality) => {
      set({ audioQuality: quality })
      localStorage.setItem('audio_quality', quality)
      updateAudioEffects(quality, get().soundMode)
    },

    setSoundMode: (mode) => {
      set({ soundMode: mode })
      localStorage.setItem('sound_mode', mode)
      updateAudioEffects(get().audioQuality, mode)
    }
  }
})
export { globalAudio }
