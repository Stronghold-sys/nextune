import { create } from 'zustand'
import { useAuthStore, checkIsPremium } from './useAuthStore'
import { supabase } from '../supabaseClient'
import { useToastStore } from './useToastStore'

const MUSIC_SERVICE_URL = import.meta.env.VITE_MUSIC_SERVICE_URL || 'http://localhost:8001'

// Two separate Audio instances: cleanAudio for YouTube streams (no CORS effects),
// and effectsAudio (with CORS anonymous and connected to Web Audio) for local tracks.
let cleanAudio = new Audio()
let effectsAudio = new Audio()
effectsAudio.crossOrigin = "anonymous"

// globalAudio points to whichever is currently active (cleanAudio by default)
let globalAudio = cleanAudio

// Web Audio API Global Instance Holders
let audioCtx = null
let sourceNode = null
let filterNode = null
let monoGainNode = null
let isConnectedToWebAudio = false

function initWebAudio() {
  if (typeof window === 'undefined') return

  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  try {
    if (!audioCtx) {
      audioCtx = new AudioContext()
      
      filterNode = audioCtx.createBiquadFilter()
      filterNode.type = 'allpass'
      
      monoGainNode = audioCtx.createGain()
      monoGainNode.channelCount = 1
      monoGainNode.channelCountMode = 'explicit'
    }

    if (!isConnectedToWebAudio) {
      sourceNode = audioCtx.createMediaElementSource(effectsAudio)
      isConnectedToWebAudio = true
    }
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

function selectAudioElement(useEffects) {
  const target = useEffects ? effectsAudio : cleanAudio
  const other = useEffects ? cleanAudio : effectsAudio
  
  try {
    other.pause()
    other.src = ""
  } catch (e) {
    console.warn(e)
  }
  
  globalAudio = target
  
  // Sync volume and speed from current store state if store has been initialized
  try {
    const store = usePlayerStore.getState()
    if (store) {
      target.volume = store.volume
      target.playbackRate = store.playbackSpeed
    }
  } catch {
    // Ignore if store is not yet fully defined
  }
  
  return target
}

function setupAudioElementListeners(audioElement) {
  audioElement.addEventListener('timeupdate', () => {
    // Only process if this is the currently active player
    if (globalAudio !== audioElement) return

    const profile = useAuthStore.getState().profile
    const isPremium = checkIsPremium(profile)

    if (!isPremium && audioElement.currentTime >= 30) {
      audioElement.pause()
      audioElement.currentTime = 0
      usePlayerStore.setState({ isPlaying: false, progress: 0 })
      window.dispatchEvent(new CustomEvent('premium-required', { detail: { reason: '30s_limit' } }))
    } else {
      usePlayerStore.setState({ progress: audioElement.currentTime })
      
      // Save progress to localStorage (at most once per second)
      const lastSavedTime = parseFloat(localStorage.getItem('nextune_last_played_progress') || '0')
      if (Math.abs(audioElement.currentTime - lastSavedTime) >= 1) {
        localStorage.setItem('nextune_last_played_progress', audioElement.currentTime.toString())
      }
    }
  })

  audioElement.addEventListener('durationchange', () => {
    if (globalAudio !== audioElement) return
    usePlayerStore.setState({ duration: audioElement.duration || 0 })
  })

  audioElement.addEventListener('ended', () => {
    if (globalAudio !== audioElement) return
    const { repeatMode, next } = usePlayerStore.getState()
    if (repeatMode === 'one') {
      audioElement.currentTime = 0
      audioElement.play().catch(err => console.log("Playback error:", err))
    } else {
      next()
    }
  })
}

// Initialize listeners on both instances
setupAudioElementListeners(cleanAudio)
setupAudioElementListeners(effectsAudio)

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
      playerVars: {
        'playsinline': 1,
        'webkit-playsinline': 1,
        'controls': 0,
        'disablekb': 1,
        'fs': 0,
        'rel': 0,
        'showinfo': 0,
        'iv_load_policy': 3
      },
      events: {
        'onReady': (event) => {
          isYtReady = true
          try {
            const iframe = event.target.getIframe()
            if (iframe) {
              iframe.setAttribute('playsinline', '1')
              iframe.setAttribute('webkit-playsinline', '1')
            }
          } catch (e) {
            console.warn("Could not set inline attributes on YT iframe:", e)
          }
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
          
          const store = usePlayerStore.getState()
          if (store && store.activePlayer === 'youtube' && store.currentYoutubeVideoId) {
            usePlayerStore.setState({ isPlaying: false, loadingStream: false, currentYoutubeVideoId: null })
            
            let errorMsg = "Gagal memutar lagu dari YouTube. Silakan coba lagi."
            if (e.data === 2) errorMsg = "Video ID tidak valid."
            if (e.data === 5) errorMsg = "Pemutaran tidak didukung di pemutar tersemat."
            if (e.data === 100) errorMsg = "Video tidak ditemukan atau telah dihapus."
            if (e.data === 101 || e.data === 150) errorMsg = "Pemilik video tidak mengizinkan pemutaran di aplikasi lain."
            
            alert(errorMsg)
          }
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
      const isPremium = checkIsPremium(profile)

      if (!isPremium && currentTime >= 30) {
        ytPlayer.pauseVideo()
        ytPlayer.seekTo(0)
        usePlayerStore.setState({ isPlaying: false, progress: 0 })
        window.dispatchEvent(new CustomEvent('premium-required', { detail: { reason: '30s_limit' } }))
      } else {
        usePlayerStore.setState({ progress: currentTime, duration })
        
        // Save progress to localStorage (at most once per second)
        const lastSavedTime = parseFloat(localStorage.getItem('nextune_last_played_progress') || '0')
        if (Math.abs(currentTime - lastSavedTime) >= 1) {
          localStorage.setItem('nextune_last_played_progress', currentTime.toString())
        }
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

// ================================================================
// HELPER TERPUSAT: Dapatkan atau buat UUID lagu di Supabase DB
// Mengembalikan UUID (36 char) jika berhasil, atau null jika gagal.
// Menyimpan metadata termasuk genre agar rekomendasi berbasis genre akurat.
// ================================================================
async function getOrCreateDbSongId(song) {
  if (!song) return null

  // Jika sudah UUID Supabase
  if (song.id && song.id.length === 36) return song.id

  // Tentukan video_id untuk lagu YouTube
  const videoId = song.video_id || song.videoId || (song.id && song.id.length === 11 ? song.id : null)
  if (!videoId) return null

  try {
    // Cek apakah sudah ada di DB
    const { data: existing } = await supabase
      .from('songs')
      .select('id, genre')
      .eq('video_id', videoId)
      .maybeSingle()

    if (existing) {
      // Update genre jika sekarang ada tapi sebelumnya kosong
      if (!existing.genre && song.genre) {
        await supabase.from('songs').update({ genre: song.genre }).eq('id', existing.id)
      }
      return existing.id
    }

    // Belum ada → insert baru dengan metadata lengkap
    const user = useAuthStore.getState().user;
    const { data: newSong, error } = await supabase
      .from('songs')
      .insert({
        title: song.title || 'Unknown',
        artist: song.artist || 'Unknown Artist',
        cover_url: song.coverUrl || song.cover_url || null,
        video_id: videoId,
        genre: song.genre || null,
        is_youtube: true,
        status: 'public',
        created_by: user ? user.id : null
      })
      .select('id')
      .single()

    if (error) {
      console.warn('getOrCreateDbSongId insert error:', error.message)
      return null
    }
    return newSong?.id || null
  } catch (err) {
    console.warn('getOrCreateDbSongId failed:', err)
    return null
  }
}

// ================================================================
// Mengambil beberapa lagu rekomendasi sekaligus untuk autoplay berkelanjutan
// Selalu mengutamakan genre lagu yang sedang diputar
// ================================================================
async function fetchRecommendedSongs(currentSong, currentQueue, count = 5) {
  const results = []

  // Tentukan genre dari lagu yang sedang diputar
  // Jika YouTube song dan belum ada genre, coba ambil dari DB
  let targetGenre = currentSong?.genre || null
  if (!targetGenre && currentSong) {
    const videoId = currentSong.video_id || currentSong.videoId || (currentSong.id?.length === 11 ? currentSong.id : null)
    if (videoId) {
      try {
        const { data } = await supabase.from('songs').select('genre').eq('video_id', videoId).maybeSingle()
        if (data?.genre) targetGenre = data.genre
      } catch (err) {
        console.warn("Failed to fetch target genre:", err)
      }
    }
  }

  try {
    // Kumpulkan semua UUID yang sudah ada di antrean (hanya 36-char UUID)
    const validUuidIds = currentQueue
      .map(s => s.id)
      .filter(id => id && id.length === 36)

    // === PRIORITAS 1: Cari lagu dari genre yang SAMA di Supabase ===
    if (targetGenre) {
      let genreQuery = supabase
        .from('songs')
        .select('*')
        .eq('status', 'public')
        .eq('genre', targetGenre)

      if (validUuidIds.length > 0) {
        genreQuery = genreQuery.not('id', 'in', `(${validUuidIds.join(',')})`)
      }

      const { data: genreData } = await genreQuery.limit(count * 3)
      if (genreData && genreData.length > 0) {
        const shuffled = [...genreData].sort(() => Math.random() - 0.5)
        results.push(...shuffled.slice(0, count))
      }
    }

    // === PRIORITAS 2: Tambah lagu acak dari Supabase jika masih kurang ===
    if (results.length < count) {
      const excludeIds = [
        ...validUuidIds,
        ...results.map(s => s.id).filter(id => id && id.length === 36)
      ]

      let randomQuery = supabase
        .from('songs')
        .select('*')
        .eq('status', 'public')

      if (excludeIds.length > 0) {
        randomQuery = randomQuery.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data: randomData } = await randomQuery.limit((count - results.length) * 2)
      if (randomData && randomData.length > 0) {
        const shuffled = [...randomData].sort(() => Math.random() - 0.5)
        results.push(...shuffled.slice(0, count - results.length))
      }
    }

    // === PRIORITAS 3: Jika Supabase kosong total, ambil semua lagu tanpa filter ===
    if (results.length === 0) {
      const { data: allData } = await supabase
        .from('songs')
        .select('*')
        .eq('status', 'public')
        .limit(count * 2)

      if (allData && allData.length > 0) {
        const shuffled = [...allData].sort(() => Math.random() - 0.5)
        results.push(...shuffled.slice(0, count))
      }
    }

    // === PRIORITAS 4: YouTube Search — gunakan genre sebagai query agar relevan ===
    if (results.length === 0) {
      // Prioritas: genre → artis+genre → musik populer
      const genreQuery = targetGenre || (currentSong?.genre) || null
      const artistQuery = currentSong?.artist || ''
      const searchQuery = genreQuery
        ? (artistQuery ? `${artistQuery} ${genreQuery}` : `${genreQuery} music`)
        : (artistQuery ? `${artistQuery} similar` : 'popular music')

      try {
        const res = await fetch(
          `${MUSIC_SERVICE_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=${count * 2}`
        )
        if (res.ok) {
          const ytResults = await res.json()
          const ytSongs = (ytResults.results || ytResults || [])
            .filter(s => s.id || s.videoId)
            .slice(0, count)
            .map(s => ({
              id: s.videoId || s.video_id || s.id,
              title: s.title,
              artist: s.artist || s.channel || 'YouTube Music',
              cover_url: s.coverUrl || s.thumbnail || s.cover_url,
              coverUrl: s.coverUrl || s.thumbnail || s.cover_url,
              video_id: s.videoId || s.video_id || s.id,
              videoId: s.videoId || s.video_id || s.id,
              genre: genreQuery || null, // simpan genre agar riwayat + statistik akurat
              is_youtube: true
            }))
          results.push(...ytSongs)
        }
      } catch (ytErr) {
        console.warn('YouTube search fallback failed:', ytErr)
      }
    }

  } catch (err) {
    console.error("Failed to fetch recommendations:", err)
  }

  return results
}


function parseLyricsContent(content, duration) {
  if (!content) return []
  
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const lrcRegex = /^\[(\d+):(\d+)(?:\.(\d+))?\](.*)/
  
  const parsed = []
  let hasTimestamps = false
  
  for (const line of lines) {
    const match = line.match(lrcRegex)
    if (match) {
      hasTimestamps = true
      const mins = parseInt(match[1], 10)
      const secs = parseInt(match[2], 10)
      const ms = match[3] ? parseInt(match[3], 10) : 0
      const time = mins * 60 + secs + (ms / 100)
      const text = match[4].trim()
      parsed.push({ time, text })
    }
  }
  
  if (hasTimestamps) {
    return parsed.sort((a, b) => a.time - b.time)
  }
  
  // Jika tidak ada stempel waktu, bagi baris-baris lirik secara merata sepanjang durasi lagu
  const totalDuration = duration || 180
  const step = Math.max(3, totalDuration / (lines.length || 1))
  
  return lines.map((text, idx) => ({
    time: idx * step,
    text
  }))
}

function getFallbackLyrics(song) {
  const title = song.title || "Lagu"
  const artist = song.artist || "Artis"
  const genre = song.genre ? ` [Genre: ${song.genre}]` : ""
  
  return [
    { time: 0, text: `[Musik - ${title} oleh ${artist}]` },
    { time: 5, text: `Sedang memutar: ${title}` },
    { time: 10, text: `Artis: ${artist}${genre}` },
    { time: 20, text: "Lirik lengkap untuk lagu ini belum tersedia." },
    { time: 30, text: "Hubungi admin atau unggah lirik di panel admin." },
    { time: 45, text: "[Melodi Indah]" },
    { time: 90, text: "Dengarkan suara berkualitas terbaik di NexTune." },
    { time: 140, text: "Terima kasih telah mendengarkan." },
    { time: 180, text: "[Selesai]" }
  ]
}

export const usePlayerStore = create((set, get) => {
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
    currentYoutubeVideoId: null, // Track currently playing YT video ID to filter spurious errors
    audioQuality: localStorage.getItem('audio_quality') || 'mono',
    soundMode: localStorage.getItem('sound_mode') || 'hifi',

    initAudio: () => {
      globalAudio.volume = get().volume
      globalAudio.playbackRate = get().playbackSpeed
      initYouTubePlayer()
    },

    playSong: async (song, newQueue = null, seekTime = null) => {
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

      const initialProgress = seekTime || 0
      set({ currentSong: song, progress: initialProgress, duration: 0, loadingStream: true, isPlaying: false })

      // Save song metadata to localStorage for resume playback feature
      localStorage.setItem('nextune_last_played_song', JSON.stringify(song))
      localStorage.setItem('nextune_last_played_progress', initialProgress.toString())

      let audioUrl = song.audioUrl || song.audio_url
      
      // Strict detection to verify if it's a YouTube song (checking for 11-char video ID formats)
      const isYoutubeSong = !!(
        song.is_youtube || 
        (song.videoId && song.videoId.length === 11) || 
        (song.video_id && song.video_id.length === 11) || 
        (!audioUrl && song.id && song.id.length === 11)
      )

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
        set({ activePlayer: 'audio', currentYoutubeVideoId: null })
        selectAudioElement(false) // YouTube streams use cleanAudio (no CORS effects)
        let videoId = song.video_id || song.videoId
        if (!videoId && song.id && song.id.length === 11) {
          videoId = song.id
        }
        
        try {
          const response = await fetch(`${MUSIC_SERVICE_URL}/stream/${videoId}`)
          const data = await response.json()
          if (!response.ok || !data.streamUrl) {
            throw new Error(data.error || 'Gagal mengekstrak URL audio YouTube.')
          }
          audioUrl = data.streamUrl
        } catch (error) {
          console.warn("YouTube play error (attempting client-side fallback):", error)
          
          if (!videoId) {
            console.error("YouTube videoId is missing for YouTube song:", song)
            set({ isPlaying: false, loadingStream: false, currentYoutubeVideoId: null })
            alert("Video ID tidak ditemukan untuk lagu ini.")
            return
          }
          
          if (ytPlayer && isYtReady) {
            try {
              // Pause and clear global HTML5 audio player
              globalAudio.pause()
              globalAudio.src = ""
              
              // Load and play video in YouTube player
              if (typeof ytPlayer.loadVideoById === 'function') {
                ytPlayer.loadVideoById({
                  videoId: videoId,
                  startSeconds: seekTime || 0
                })
              } else {
                ytPlayer.cueVideoById({ videoId, startSeconds: seekTime || 0 })
                ytPlayer.playVideo()
              }
              
              // Apply volume and playback settings
              ytPlayer.setVolume(get().volume * 100)
              if (typeof ytPlayer.setPlaybackRate === 'function') {
                ytPlayer.setPlaybackRate(get().playbackSpeed)
              }
              
              set({ activePlayer: 'youtube', currentYoutubeVideoId: videoId, loadingStream: false, isPlaying: true })
              get().saveToPlayHistory(song)
              get().loadLyrics(song)
              return
            } catch (ytErr) {
              console.error("YouTube Player fallback failed:", ytErr)
            }
          }
          
          set({ isPlaying: false, loadingStream: false, currentYoutubeVideoId: null })
          const msg = error.message?.includes('bot') || error.message?.includes('Sign in')
            ? 'Lagu tidak dapat diputar saat ini karena deteksi bot YouTube. Coba lagi sebentar atau pilih lagu lain.'
            : 'Gagal memutar lagu. Silakan coba lagi.'
          alert(msg)
          return
        }
      } else {
        set({ activePlayer: 'audio', currentYoutubeVideoId: null })
        selectAudioElement(true) // Local songs use effectsAudio (supports CORS effects)
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
        
        if (seekTime) {
          globalAudio.currentTime = seekTime
        }
        
        set({ isPlaying: true, loadingStream: false })
        
        get().saveToPlayHistory(song)
        get().loadLyrics(song)
      } catch (error) {
        console.error("Audio play error:", error)
        set({ isPlaying: false, loadingStream: false })
      }
    },

    saveToPlayHistory: async (song) => {
      const user = useAuthStore.getState().user
      if (!user) return

      try {
        // Dapatkan UUID Supabase — termasuk membuat record baru jika YouTube song belum ada di DB
        const songId = await getOrCreateDbSongId(song)

        if (!songId) {
          console.warn('saveToPlayHistory: gagal mendapatkan songId untuk', song.title)
          return
        }

        await supabase
          .from('play_history')
          .insert({ user_id: user.id, song_id: songId })
      } catch (err) {
        console.warn('Gagal mencatat riwayat pemutaran:', err.message || err)
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

    next: async () => {
      const { queue, currentIndex, repeatMode, activePlayer, currentSong, shuffle } = get()
      if (queue.length === 0) return

      let nextIndex = currentIndex + 1
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          // Ulangi dari awal antrean
          nextIndex = 0
          set({ currentIndex: nextIndex })
          get().playSong(queue[nextIndex])
        } else {
          // === ANTREAN HABIS: Muat batch lagu rekomendasi baru ===
          set({ loadingStream: true })

          const recommended = await fetchRecommendedSongs(currentSong, queue, 5)

          if (recommended && recommended.length > 0) {
            // Acak urutan batch jika shuffle aktif
            const orderedBatch = shuffle
              ? [...recommended].sort(() => Math.random() - 0.5)
              : recommended

            const newQueue = [...queue, ...orderedBatch]
            const newOriginalQueue = [...get().originalQueue, ...orderedBatch]

            set({
              queue: newQueue,
              originalQueue: newOriginalQueue,
              currentIndex: nextIndex,
              loadingStream: false
            })

            const firstSong = orderedBatch[0]
            useToastStore.getState().showToast(
              `🎵 Autoplay: Menambahkan ${orderedBatch.length} lagu rekomendasi`,
              'info'
            )
            get().playSong(firstSong)
          } else {
            // Jika benar-benar tidak ada lagu yang bisa diputar, berhenti
            if (activePlayer === 'audio') {
              globalAudio.pause()
            } else if (activePlayer === 'youtube' && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
              ytPlayer.pauseVideo()
            }
            set({ isPlaying: false, progress: 0, loadingStream: false })
            useToastStore.getState().showToast('Tidak ada lagu lain yang tersedia untuk diputar.', 'info')
          }
        }
      } else {
        set({ currentIndex: nextIndex })
        get().playSong(queue[nextIndex])
      }
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
      const isPremium = checkIsPremium(profile)
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
        const isPremium = checkIsPremium(profile)
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
      const isPremium = checkIsPremium(profile)
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
      if (!song) return
      
      // === LANGKAH 1: Coba ambil dari Supabase DB (untuk lagu lokal yang sudah diupload liriknya) ===
      let dbSongId = null

      if (song.id && song.id.length === 36) {
        dbSongId = song.id
      } else {
        let ytId = song.video_id || song.videoId
        if (!ytId && song.id && song.id.length === 11) {
          ytId = song.id
        }
        if (ytId) {
          try {
            const { data: dbSong } = await supabase
              .from('songs')
              .select('id')
              .eq('video_id', ytId)
              .maybeSingle()
            if (dbSong) dbSongId = dbSong.id
          } catch (err) {
            console.warn("Failed to lookup song by video ID:", err)
          }
        }
      }

      if (dbSongId) {
        try {
          const { data } = await supabase
            .from('lyrics')
            .select('content, is_synced')
            .eq('song_id', dbSongId)
            .maybeSingle()

          if (data && data.content && data.content.trim()) {
            const duration = get().duration || song.duration_seconds || 180
            const parsed = parseLyricsContent(data.content, duration)
            set({ lyrics: parsed, isLyricsSynced: data.is_synced || false })
            return // Lirik dari DB berhasil dimuat
          }
        } catch (err) {
          console.warn("Failed to load lyrics from database:", err)
        }
      }

      // === LANGKAH 2: Ambil dari Music Service (lrclib.net + lyrics.ovh) ===
      const songTitle = song.title || ''
      const songArtist = song.artist || ''

      if (songTitle && songArtist) {
        try {
          const durationParam = song.duration_seconds || get().duration || ''
          const lyricsUrl = `${MUSIC_SERVICE_URL}/lyrics?title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}${durationParam ? `&duration=${Math.round(durationParam)}` : ''}`
          
          const res = await fetch(lyricsUrl, { signal: AbortSignal.timeout(8000) })
          
          if (res.ok) {
            const data = await res.json()
            
            // Jika ada lirik tersinkronisasi LRC
            if (data.synced && data.lyrics) {
              const duration = get().duration || song.duration_seconds || 180
              const parsed = parseLyricsContent(data.lyrics, duration)
              if (parsed.length > 0) {
                set({ lyrics: parsed, isLyricsSynced: true })
                return
              }
            }
            
            // Gunakan plain lyrics jika tidak ada LRC
            if (data.plainLyrics && data.plainLyrics.trim()) {
              const duration = get().duration || song.duration_seconds || 180
              const parsed = parseLyricsContent(data.plainLyrics, duration)
              if (parsed.length > 0) {
                set({ lyrics: parsed, isLyricsSynced: false })
                return
              }
            }
          }
        } catch (err) {
          console.warn('Gagal mengambil lirik dari music service:', err.message || err)
        }
      }

      // === LANGKAH 3: Fallback - tampilkan info lagu dasar ===
      set({ lyrics: getFallbackLyrics(song), isLyricsSynced: false })
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
