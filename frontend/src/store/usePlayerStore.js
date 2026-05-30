import { create } from 'zustand'
import { useAuthStore } from './useAuthStore'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

// Global HTML5 Audio instance for custom uploads
let globalAudio = new Audio()

// YouTube Player state holders
let ytPlayer = null
let ytProgressInterval = null

// Load YouTube IFrame API
if (typeof window !== 'undefined') {
  // Load IFrame Player API script if not loaded
  if (!window.YT) {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
  }

  // Register callback
  window.onYouTubeIframeAPIReady = () => {
    initYouTubePlayer()
  }

  // Check if script is already loaded and ready
  if (window.YT && window.YT.Player) {
    setTimeout(initYouTubePlayer, 100)
  }
}

function initYouTubePlayer() {
  if (ytPlayer) return

  let placeholder = document.getElementById('yt-player-placeholder')
  if (!placeholder) {
    placeholder = document.createElement('div')
    placeholder.id = 'yt-player-placeholder'
    placeholder.style.position = 'absolute'
    placeholder.style.width = '0px'
    placeholder.style.height = '0px'
    placeholder.style.opacity = '0'
    placeholder.style.pointerEvents = 'none'
    document.body.appendChild(placeholder)
  }

  try {
    ytPlayer = new window.YT.Player('yt-player-placeholder', {
      height: '0',
      width: '0',
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
          alert("Gagal memutar lagu dari YouTube. Silakan coba lagi.")
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
        } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
          ytPlayer.pauseVideo()
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
        set({ activePlayer: 'youtube' })
        const videoId = song.videoId || song.id
        
        try {
          if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
            initYouTubePlayer()
            console.log("YouTube player not initialized, trying to wait...")
            await new Promise(resolve => setTimeout(resolve, 1000))
            if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
              throw new Error("YouTube IFrame Player tidak tersedia.")
            }
          }
          
          ytPlayer.setVolume(get().volume * 100)
          ytPlayer.setPlaybackRate(get().playbackSpeed)
          ytPlayer.loadVideoById(videoId)
          ytPlayer.playVideo()
          
          get().loadLyrics(song)
        } catch (error) {
          console.error("YouTube play error:", error)
          set({ isPlaying: false, loadingStream: false })
          alert("Gagal memutar lagu dari YouTube. Harap coba lagi.")
        }
      } else {
        set({ activePlayer: 'audio' })
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
          
          await globalAudio.play()
          set({ isPlaying: true, loadingStream: false })
          
          get().loadLyrics(song)
        } catch (error) {
          console.error("Audio play error:", error)
          set({ isPlaying: false, loadingStream: false })
        }
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
      const { queue, currentIndex, currentSong } = get()
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
    }
  }
})
export { globalAudio }
