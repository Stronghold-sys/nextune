import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import yt_dlp

app = FastAPI(title="NexTune Music Engine", version="1.0.0")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YTMusic
# Note: we use anonymous mode which doesn't require headers auth for basic searches/playing.
try:
    ytmusic = YTMusic()
except Exception as e:
    print(f"Error initializing YTMusic: {e}")
    # Fallback initialization
    ytmusic = None

def get_ytmusic_client():
    if not ytmusic:
        raise HTTPException(status_code=500, detail="Music service not initialized")
    return ytmusic

@app.get("/")
def read_root():
    return {"name": "NexTune Music Engine API", "status": "running"}

@app.get("/search")
def search(q: str = Query(..., description="Query pencarian")):
    client = get_ytmusic_client()
    try:
        results = client.search(q)
        formatted_results = []
        for item in results:
            result_type = item.get("resultType")
            if result_type not in ["song", "video", "album", "artist", "playlist"]:
                continue
            
            thumbnails = item.get("thumbnails", [])
            cover_url = thumbnails[-1].get("url") if thumbnails else ""
            
            artists = item.get("artists", [])
            artist_names = ", ".join([a.get("name", "") for a in artists]) if artists else item.get("author", "")
            
            formatted_results.append({
                "id": item.get("videoId") or item.get("browseId") or item.get("playlistId"),
                "title": item.get("title", "Unknown"),
                "type": result_type if result_type != "video" else "song",
                "artist": artist_names,
                "album": item.get("album", {}).get("name", "") if "album" in item else "",
                "coverUrl": cover_url,
                "duration": item.get("duration", ""),
                "durationSeconds": item.get("duration_seconds", 0)
            })
        return {"query": q, "results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/song/{video_id}")
def get_song(video_id: str):
    client = get_ytmusic_client()
    try:
        song_info = client.get_song(video_id)
        video_details = song_info.get("videoDetails", {})
        
        # Get details
        thumbnails = video_details.get("thumbnail", {}).get("thumbnails", [])
        cover_url = thumbnails[-1].get("url") if thumbnails else ""
        
        return {
            "id": video_id,
            "title": video_details.get("title", "Unknown"),
            "artist": video_details.get("author", "Unknown Artist"),
            "coverUrl": cover_url,
            "durationSeconds": int(video_details.get("lengthSeconds", 0)),
            "views": video_details.get("viewCount", "0")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/artist/{artist_id}")
def get_artist(artist_id: str):
    client = get_ytmusic_client()
    try:
        artist_info = client.get_artist(artist_id)
        
        # Format tracks
        songs = []
        for track in artist_info.get("songs", {}).get("results", []):
            thumbnails = track.get("thumbnails", [])
            cover_url = thumbnails[-1].get("url") if thumbnails else ""
            songs.append({
                "id": track.get("videoId"),
                "title": track.get("title"),
                "artist": artist_info.get("name"),
                "album": track.get("album", {}).get("name", ""),
                "coverUrl": cover_url,
                "duration": track.get("duration", "")
            })
            
        # Format albums
        albums = []
        for album in artist_info.get("albums", {}).get("results", []):
            thumbnails = album.get("thumbnails", [])
            cover_url = thumbnails[-1].get("url") if thumbnails else ""
            albums.append({
                "id": album.get("browseId"),
                "title": album.get("title"),
                "coverUrl": cover_url,
                "year": album.get("year", "")
            })

        thumbnails = artist_info.get("thumbnails", [])
        photo_url = thumbnails[-1].get("url") if thumbnails else ""

        return {
            "id": artist_id,
            "name": artist_info.get("name"),
            "photoUrl": photo_url,
            "description": artist_info.get("description", ""),
            "songs": songs,
            "albums": albums
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/playlist/{playlist_id}")
def get_playlist(playlist_id: str):
    client = get_ytmusic_client()
    try:
        playlist_info = client.get_playlist(playlist_id)
        
        tracks = []
        for track in playlist_info.get("tracks", []):
            thumbnails = track.get("thumbnails", [])
            cover_url = thumbnails[-1].get("url") if thumbnails else ""
            
            artists = track.get("artists", [])
            artist_names = ", ".join([a.get("name", "") for a in artists]) if artists else "Unknown Artist"
            
            tracks.append({
                "id": track.get("videoId"),
                "title": track.get("title"),
                "artist": artist_names,
                "album": track.get("album", {}).get("name", "") if track.get("album") else "",
                "coverUrl": cover_url,
                "duration": track.get("duration", ""),
                "durationSeconds": track.get("duration_seconds", 0)
            })
            
        thumbnails = playlist_info.get("thumbnails", [])
        cover_url = thumbnails[-1].get("url") if thumbnails else ""

        return {
            "id": playlist_id,
            "title": playlist_info.get("title"),
            "description": playlist_info.get("description", ""),
            "coverUrl": cover_url,
            "tracks": tracks,
            "trackCount": playlist_info.get("trackCount", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/home")
def get_home_feed():
    client = get_ytmusic_client()
    try:
        # Get charts/trending
        charts = client.get_charts()
        
        trending_songs = []
        for track in charts.get("songs", {}).get("items", [])[:12]:
            thumbnails = track.get("thumbnails", [])
            cover_url = thumbnails[-1].get("url") if thumbnails else ""
            artists = track.get("artists", [])
            artist_names = ", ".join([a.get("name", "") for a in artists]) if artists else "Unknown Artist"
            trending_songs.append({
                "id": track.get("videoId"),
                "title": track.get("title"),
                "artist": artist_names,
                "album": track.get("album", {}).get("name", "") if track.get("album") else "",
                "coverUrl": cover_url
            })
            
        trending_artists = []
        for artist in charts.get("artists", {}).get("items", [])[:8]:
            thumbnails = artist.get("thumbnails", [])
            photo_url = thumbnails[-1].get("url") if thumbnails else ""
            trending_artists.append({
                "id": artist.get("browseId"),
                "name": artist.get("artist"),
                "photoUrl": photo_url
            })
            
        trending_albums = []
        for album in charts.get("albums", {}).get("items", [])[:8]:
            thumbnails = album.get("thumbnails", [])
            cover_url = thumbnails[-1].get("url") if thumbnails else ""
            artists = album.get("artists", [])
            artist_names = ", ".join([a.get("name", "") for a in artists]) if artists else "Unknown Artist"
            trending_albums.append({
                "id": album.get("browseId"),
                "title": album.get("title"),
                "artist": artist_names,
                "coverUrl": cover_url
            })

        return {
            "trendingSongs": trending_songs,
            "popularArtists": trending_artists,
            "popularAlbums": trending_albums
        }
    except Exception as e:
        # If charts fail, try fallback home
        try:
            home_data = client.get_home(limit=3)
            # Create a simple mapping from home data categories
            songs = []
            artists = []
            albums = []
            for row in home_data:
                title = row.get("title", "").lower()
                results = row.get("contents", [])
                for item in results:
                    thumbnails = item.get("thumbnails", [])
                    img_url = thumbnails[-1].get("url") if thumbnails else ""
                    
                    if "song" in title or "track" in title or "hits" in title:
                        songs.append({
                            "id": item.get("videoId"),
                            "title": item.get("title"),
                            "artist": ", ".join([a.get("name", "") for a in item.get("artists", [])]) or "Unknown",
                            "coverUrl": img_url
                        })
                    elif "artist" in title:
                        artists.append({
                            "id": item.get("browseId"),
                            "name": item.get("title"),
                            "photoUrl": img_url
                        })
                    elif "album" in title or "release" in title:
                        albums.append({
                            "id": item.get("browseId"),
                            "title": item.get("title"),
                            "artist": ", ".join([a.get("name", "") for a in item.get("artists", [])]) or "Unknown",
                            "coverUrl": img_url
                        })
            return {
                "trendingSongs": songs[:12] if songs else [],
                "popularArtists": artists[:8] if artists else [],
                "popularAlbums": albums[:8] if albums else []
            }
        except Exception as inner_e:
            raise HTTPException(status_code=500, detail=f"Home & Chart fetch failed: {str(e)} | Fallback failed: {str(inner_e)}")

@app.get("/stream/{video_id}")
def get_stream_url(video_id: str):
    try:
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        ydl_opts = {
            'format': 'bestaudio',
            'quiet': True,
            'skip_download': True,
            'force_generic_extractor': False,
            'nocheckcertificate': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            stream_url = info.get('url')
            return {"streamUrl": stream_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract stream: {str(e)}")
