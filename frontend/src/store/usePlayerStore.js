import { create } from 'zustand'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

// Global HTML5 Audio instance for persistence across routes
let globalAudio = new Audio()

export const usePlayerStore = create((set, get) => {
  // Update state with audio element progress
  globalAudio.addEventListener('timeupdate', () => {
    set({ progress: globalAudio.currentTime })
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

    initAudio: () => {
      globalAudio.volume = get().volume
      globalAudio.playbackRate = get().playbackSpeed
    },

    playSong: async (song, newQueue = null) => {
      const { isPlaying } = get()
      
      if (isPlaying) {
        globalAudio.pause()
      }

      set({ currentSong: song, progress: 0, duration: 0, loadingStream: true, isPlaying: false })

      let audioUrl = song.audioUrl || song.audio_url

      // If it's a YouTube track and doesn't have a direct URL, fetch it from FastAPI
      if (song.is_youtube || song.videoId || (song.id && !audioUrl)) {
        const videoId = song.videoId || song.id
        try {
          const res = await fetch(`${MUSIC_SERVICE_URL}/stream/${videoId}`)
          if (!res.ok) throw new Error("Gagal mengambil stream URL")
          const data = await res.json()
          audioUrl = data.streamUrl
        } catch (error) {
          console.error("Error fetching stream:", error)
          set({ loadingStream: false })
          alert("Gagal memutar lagu dari YouTube Music.")
          return
        }
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
        
        // Handle custom queues
        if (newQueue) {
          const idx = newQueue.findIndex(s => (s.id || s.videoId) === (song.id || song.videoId))
          set({ 
            queue: [...newQueue], 
            originalQueue: [...newQueue],
            currentIndex: idx !== -1 ? idx : 0 
          })
        }

        await globalAudio.play()
        set({ isPlaying: true, loadingStream: false })
        
        // Load lyrics
        get().loadLyrics(song)
      } catch (error) {
        console.error("Playback play error:", error)
        set({ isPlaying: false, loadingStream: false })
      }
    },

    togglePlay: () => {
      const { isPlaying, currentSong } = get()
      if (!currentSong) return

      if (isPlaying) {
        globalAudio.pause()
        set({ isPlaying: false })
      } else {
        globalAudio.play().catch(err => console.log("Playback toggle error:", err))
        set({ isPlaying: true })
      }
    },

    next: () => {
      const { queue, currentIndex, repeatMode } = get()
      if (queue.length === 0) return

      let nextIndex = currentIndex + 1
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0
        } else {
          // stop playing
          globalAudio.pause()
          set({ isPlaying: false, progress: 0 })
          return
        }
      }

      set({ currentIndex: nextIndex })
      get().playSong(queue[nextIndex])
    },

    prev: () => {
      const { queue, currentIndex, progress } = get()
      if (queue.length === 0) return

      // If playing has progressed past 3s, restart song
      if (progress > 3) {
        globalAudio.currentTime = 0
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
      globalAudio.currentTime = time
      set({ progress: time })
    },

    setVolume: (vol) => {
      const v = Math.max(0, Math.min(1, vol))
      globalAudio.volume = v
      set({ volume: v })
    },

    setPlaybackSpeed: (speed) => {
      globalAudio.playbackRate = speed
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
      // Check if song already in queue
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
      if (sleepInterval) clearInterval(sleepInterval)
      
      if (minutes === null) {
        set({ sleepTimer: null })
        return
      }

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
          // Stop music
          togglePlay()
        } else {
          set({ sleepTimer: sleepTimer - 1 })
        }
      }, 60000) // update each minute
    },

    loadLyrics: async (song) => {
      // Setup demo synchronized lyrics or fetch if available
      // Synced lyrics format: { time: seconds, text: string }
      // We will provide default mock synchronized lyrics based on duration
      // or plain text lyrics to support the lirik feature fully
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
