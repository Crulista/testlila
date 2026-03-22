import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/* ────────────────────── CONFIG ────────────────────── */
const MAP_CONFIG = {
  AmbroseValley: { scale: 900, ox: -370, oz: -473, img: 'minimaps/AmbroseValley_Minimap.png' },
  GrandRift:     { scale: 581, ox: -290, oz: -290, img: 'minimaps/GrandRift_Minimap.png' },
  Lockdown:      { scale: 1000, ox: -500, oz: -500, img: 'minimaps/Lockdown_Minimap.jpg' },
}

const EVENT_COLORS = {
  Kill: '#ff4444',
  BotKill: '#ff8844',
  Killed: '#ff0000',
  BotKilled: '#cc4400',
  KilledByStorm: '#aa44ff',
  Loot: '#44ff88',
}

const EVENT_ICONS = {
  Kill: '⚔️', BotKill: '🤖⚔️', Killed: '💀', BotKilled: '🤖💀',
  KilledByStorm: '🌩️', Loot: '📦',
}

const HEATMAP_TYPES = [
  { key: 'kills', label: 'Kill Zones', color: [255, 60, 60] },
  { key: 'deaths', label: 'Death Zones', color: [255, 0, 0] },
  { key: 'storm_deaths', label: 'Storm Deaths', color: [170, 68, 255] },
  { key: 'loots', label: 'Loot Spots', color: [68, 255, 136] },
  { key: 'traffic', label: 'Traffic', color: [255, 200, 40] },
]

/* ────────────────────── STYLES ────────────────────── */
const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a0a0f; color:#e0e0e0; font-family:'Inter',sans-serif; overflow:hidden; }
  
  .app { display:flex; height:100vh; width:100vw; }
  
  /* Sidebar */
  .sidebar { width:320px; min-width:320px; background:#111118; border-right:1px solid #222; display:flex; flex-direction:column; overflow:hidden; }
  .sidebar-header { padding:16px 20px; border-bottom:1px solid #222; }
  .sidebar-header h1 { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:700; color:#ff4444; letter-spacing:2px; text-transform:uppercase; }
  .sidebar-header p { font-size:11px; color:#666; margin-top:4px; font-family:'JetBrains Mono',monospace; }
  
  .sidebar-section { padding:12px 16px; border-bottom:1px solid #1a1a22; }
  .sidebar-section h3 { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; color:#888; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; }
  
  .sidebar-scroll { flex:1; overflow-y:auto; }
  .sidebar-scroll::-webkit-scrollbar { width:4px; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
  
  /* Controls */
  select, input { width:100%; padding:8px 10px; background:#0d0d14; border:1px solid #2a2a35; border-radius:4px; color:#ccc; font-size:12px; font-family:'Inter',sans-serif; outline:none; }
  select:focus, input:focus { border-color:#ff4444; }
  option { background:#111; }
  
  .filter-row { display:flex; gap:8px; margin-bottom:8px; }
  .filter-row > * { flex:1; }
  
  .btn { padding:6px 12px; border:1px solid #333; background:#1a1a22; color:#ccc; border-radius:4px; cursor:pointer; font-size:11px; font-family:'JetBrains Mono',monospace; transition:all .15s; }
  .btn:hover { background:#252530; border-color:#555; }
  .btn.active { background:#ff4444; border-color:#ff4444; color:#fff; }
  .btn-group { display:flex; gap:4px; flex-wrap:wrap; }
  
  .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:4px 0; }
  .toggle-row label { font-size:12px; color:#aaa; cursor:pointer; display:flex; align-items:center; gap:6px; }
  .toggle-row input[type=checkbox] { accent-color:#ff4444; }
  
  /* Match list */
  .match-item { padding:8px 10px; border:1px solid #1a1a22; border-radius:4px; margin-bottom:4px; cursor:pointer; transition:all .15s; font-size:11px; }
  .match-item:hover { border-color:#333; background:#151520; }
  .match-item.selected { border-color:#ff4444; background:#1a1015; }
  .match-meta { display:flex; justify-content:space-between; color:#666; font-size:10px; margin-top:3px; font-family:'JetBrains Mono',monospace; }
  .match-map { color:#ff8844; font-weight:600; }
  
  /* Player list */
  .player-item { display:flex; align-items:center; gap:8px; padding:4px 8px; border-radius:3px; font-size:11px; cursor:pointer; }
  .player-item:hover { background:#1a1a22; }
  .player-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .player-id { font-family:'JetBrains Mono',monospace; font-size:10px; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
  .player-tag { font-size:9px; padding:1px 5px; border-radius:2px; font-weight:600; }
  .player-tag.human { background:#1a2a1a; color:#44ff88; }
  .player-tag.bot { background:#2a1a1a; color:#ff8844; }
  
  /* Main area */
  .main { flex:1; display:flex; flex-direction:column; position:relative; overflow:hidden; }
  
  /* Top bar */
  .topbar { height:44px; background:#111118; border-bottom:1px solid #222; display:flex; align-items:center; justify-content:space-between; padding:0 16px; }
  .topbar-info { font-family:'JetBrains Mono',monospace; font-size:11px; color:#888; }
  .topbar-info span { color:#ff4444; }
  
  /* Stats bar */
  .stats-bar { display:flex; gap:16px; }
  .stat { text-align:center; }
  .stat-val { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:700; color:#fff; }
  .stat-label { font-size:9px; color:#666; text-transform:uppercase; letter-spacing:1px; }
  
  /* Canvas area */
  .canvas-wrapper { flex:1; position:relative; overflow:hidden; background:#08080c; display:flex; align-items:center; justify-content:center; }
  
  canvas { image-rendering:auto; }
  
  /* Timeline */
  .timeline { height:64px; background:#111118; border-top:1px solid #222; display:flex; align-items:center; padding:0 16px; gap:12px; }
  .timeline-controls { display:flex; gap:6px; align-items:center; }
  .timeline-btn { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border:1px solid #333; background:#1a1a22; color:#ccc; border-radius:4px; cursor:pointer; font-size:14px; }
  .timeline-btn:hover { background:#252530; }
  .timeline-btn.playing { background:#ff4444; border-color:#ff4444; }
  .timeline-slider { flex:1; }
  .timeline-slider input[type=range] { width:100%; height:4px; -webkit-appearance:none; background:#222; border-radius:2px; outline:none; }
  .timeline-slider input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; background:#ff4444; border-radius:50%; cursor:pointer; }
  .timeline-time { font-family:'JetBrains Mono',monospace; font-size:12px; color:#888; min-width:100px; text-align:right; }
  
  /* Legend */
  .legend { position:absolute; bottom:80px; right:16px; background:rgba(17,17,24,0.92); border:1px solid #222; border-radius:6px; padding:10px 14px; font-size:11px; backdrop-filter:blur(8px); }
  .legend h4 { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; font-family:'JetBrains Mono',monospace; }
  .legend-item { display:flex; align-items:center; gap:8px; padding:2px 0; }
  .legend-color { width:10px; height:10px; border-radius:2px; }
  
  /* Loading */
  .loading { display:flex; align-items:center; justify-content:center; height:100%; color:#666; font-family:'JetBrains Mono',monospace; }
  .loading-spinner { width:24px; height:24px; border:2px solid #333; border-top-color:#ff4444; border-radius:50%; animation:spin .8s linear infinite; margin-right:12px; }
  @keyframes spin { to { transform:rotate(360deg); } }
  
  /* Empty state */
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#444; text-align:center; }
  .empty-state h2 { font-family:'JetBrains Mono',monospace; font-size:16px; color:#666; margin-bottom:8px; }
  .empty-state p { font-size:13px; max-width:300px; line-height:1.6; }

  /* Speed control */
  .speed-control { display:flex; align-items:center; gap:4px; }
  .speed-btn { padding:2px 6px; font-size:10px; font-family:'JetBrains Mono',monospace; border:1px solid #333; background:#1a1a22; color:#888; border-radius:3px; cursor:pointer; }
  .speed-btn.active { color:#ff4444; border-color:#ff4444; }
`

/* ────────────────────── HEATMAP CANVAS RENDERER ────────────────────── */
function drawHeatmap(ctx, points, color, radius, canvasSize, alpha = 0.6) {
  if (!points || points.length === 0) return
  
  const heatCanvas = document.createElement('canvas')
  heatCanvas.width = canvasSize
  heatCanvas.height = canvasSize
  const hctx = heatCanvas.getContext('2d')
  
  // Draw intensity
  points.forEach(p => {
    const px = (p.px / 1024) * canvasSize
    const py = (p.py / 1024) * canvasSize
    const gradient = hctx.createRadialGradient(px, py, 0, px, py, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    hctx.fillStyle = gradient
    hctx.fillRect(px - radius, py - radius, radius * 2, radius * 2)
  })
  
  // Colorize
  const imageData = hctx.getImageData(0, 0, canvasSize, canvasSize)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const intensity = data[i + 3] / 255
    if (intensity > 0.01) {
      data[i] = color[0]
      data[i + 1] = color[1]
      data[i + 2] = color[2]
      data[i + 3] = Math.min(255, intensity * 255 * alpha * 3)
    }
  }
  hctx.putImageData(imageData, 0, 0)
  
  ctx.drawImage(heatCanvas, 0, 0)
}

/* ────────────────────── PLAYER COLORS ────────────────────── */
const PLAYER_COLORS = [
  '#44aaff','#ff44aa','#44ffaa','#ffaa44','#aa44ff','#ff4444',
  '#44ffff','#ffff44','#aa88ff','#ff88aa','#88ffaa','#ffaa88',
  '#4488ff','#ff4488','#88ff44','#ff8844','#8844ff','#44ff88',
  '#ff44ff','#88ff88','#ff8888','#8888ff','#88ffff','#ffff88',
]

function getPlayerColor(index, isBot) {
  if (isBot) return '#555555'
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

/* ────────────────────── MAIN APP ────────────────────── */
export default function App() {
  const [matchIndex, setMatchIndex] = useState(null)
  const [heatmapData, setHeatmapData] = useState(null)
  const [dailyStats, setDailyStats] = useState(null)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchData, setMatchData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [matchLoading, setMatchLoading] = useState(false)
  
  // Filters
  const [filterMap, setFilterMap] = useState('all')
  const [filterDay, setFilterDay] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Visualization options
  const [showBots, setShowBots] = useState(true)
  const [showPaths, setShowPaths] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [activeHeatmap, setActiveHeatmap] = useState(null)
  const [showHumansOnly, setShowHumansOnly] = useState(false)
  
  // Timeline
  const [timeProgress, setTimeProgress] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1)
  const animRef = useRef(null)
  const lastFrameRef = useRef(null)
  
  // Canvas
  const canvasRef = useRef(null)
  const mapImageRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState(800)
  const wrapperRef = useRef(null)

  /* ── Load initial data ── */
  useEffect(() => {
  Promise.all([
    fetch('/matches.json').then(r => r.json()),
    fetch('./data/heatmaps.json').then(r => r.json()),
    fetch('./data/daily_stats.json').then(r => r.json()),
  ]).then(([matches, heatmaps, stats]) => {

  // Convert object → array
    const matchArray = Object.entries(matches).map(([id, value]) => ({
      match_id: id,
      ...value
  }))

  console.log("TOTAL MATCHES:", matchArray.length)

  // ✅ Set correct state
  setMatchIndex(matchArray)
  setHeatmapData(heatmaps)
  setDailyStats(stats)
  setLoading(false)
})
  }, [])

  /* ── Load match data when selected ── */
  useEffect(() => {
    if (!selectedMatch) { setMatchData(null); return }
    setMatchLoading(true)
    setTimeProgress(1)
    setIsPlaying(false)
    const safeId = selectedMatch.match_id.replace(/\./g, '_')
    fetch(`./data/matches/${safeId}.json`)
      .then(r => r.json())
      .then(data => { setMatchData(data); setMatchLoading(false) })
      .catch(() => setMatchLoading(false))
  }, [selectedMatch])

  /* ── Load map image when match data changes ── */
  useEffect(() => {
    const mapId = matchData?.map_id || (activeHeatmap && filterMap !== 'all' ? filterMap : 'AmbroseValley')
    if (!mapId) return
    const img = new Image()
    img.src = `./${MAP_CONFIG[mapId].img}`
    img.onload = () => { mapImageRef.current = img; renderCanvas() }
  }, [matchData, activeHeatmap, filterMap])

  /* ── Resize canvas ── */
  useEffect(() => {
    const resize = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        const size = Math.min(rect.width - 32, rect.height - 32)
        setCanvasSize(Math.max(400, size))
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  /* ── Timeline playback ── */
  useEffect(() => {
    if (!isPlaying || !matchData) return
    lastFrameRef.current = performance.now()
    
    const animate = (now) => {
      const delta = (now - lastFrameRef.current) / 1000
      lastFrameRef.current = now
      
      setTimeProgress(prev => {
        const increment = (delta * playSpeed) / matchData.duration
        const next = prev + increment
        if (next >= 1) { setIsPlaying(false); return 1 }
        return next
      })
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [isPlaying, matchData, playSpeed])

  /* ── Render canvas ── */
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvasSize
    canvas.width = size
    canvas.height = size
    
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = '#08080c'
    ctx.fillRect(0, 0, size, size)
    
    // Draw map image
    if (mapImageRef.current) {
      ctx.drawImage(mapImageRef.current, 0, 0, size, size)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, size, size)
    }
    
    const currentMapId = matchData?.map_id || (filterMap !== 'all' ? filterMap : 'AmbroseValley')
    
    // Draw heatmap overlay
    if (activeHeatmap && heatmapData && heatmapData[currentMapId]) {
      const hmType = HEATMAP_TYPES.find(h => h.key === activeHeatmap)
      if (hmType) {
        const points = heatmapData[currentMapId][activeHeatmap]
        const radius = activeHeatmap === 'traffic' ? 12 : 20
        drawHeatmap(ctx, points, hmType.color, radius, size, 0.7)
      }
    }
    
    // Draw match data (paths + events)
    if (matchData && showPaths) {
      const currentTime = timeProgress * matchData.duration
      let humanIdx = 0
      
      matchData.players.forEach((player) => {
        if (player.is_bot && !showBots) return
        if (showHumansOnly && player.is_bot) return
        
        const color = getPlayerColor(humanIdx, player.is_bot)
        if (!player.is_bot) humanIdx++
        
        // Filter path points by timeline
        const visiblePath = player.path.filter(p => p.t <= currentTime)
        if (visiblePath.length < 2) return
        
        // Draw path
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = player.is_bot ? 1 : 2
        ctx.globalAlpha = player.is_bot ? 0.25 : 0.7
        
        const scale = size / 1024
        ctx.moveTo(visiblePath[0].px * scale, visiblePath[0].py * scale)
        for (let i = 1; i < visiblePath.length; i++) {
          ctx.lineTo(visiblePath[i].px * scale, visiblePath[i].py * scale)
        }
        ctx.stroke()
        ctx.globalAlpha = 1
        
        // Draw current position (head of path)
        if (visiblePath.length > 0 && timeProgress < 1) {
          const last = visiblePath[visiblePath.length - 1]
          ctx.beginPath()
          ctx.fillStyle = color
          ctx.arc(last.px * scale, last.py * scale, player.is_bot ? 3 : 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      })
    }
    
    // Draw events
    if (matchData && showEvents) {
      const currentTime = timeProgress * matchData.duration
      
      matchData.players.forEach((player) => {
        if (player.is_bot && !showBots) return
        if (showHumansOnly && player.is_bot) return
        
        player.events.forEach(ev => {
          if (ev.t > currentTime) return
          
          const scale = size / 1024
          const x = ev.px * scale
          const y = ev.py * scale
          const evColor = EVENT_COLORS[ev.type] || '#fff'
          
          // Draw event marker
          ctx.beginPath()
          ctx.fillStyle = evColor
          ctx.globalAlpha = 0.9
          
          if (ev.type === 'Loot') {
            ctx.fillRect(x - 3, y - 3, 6, 6)
          } else if (ev.type === 'KilledByStorm') {
            // Diamond shape
            ctx.moveTo(x, y - 5)
            ctx.lineTo(x + 5, y)
            ctx.lineTo(x, y + 5)
            ctx.lineTo(x - 5, y)
            ctx.closePath()
            ctx.fill()
          } else {
            // Circle for kills/deaths
            ctx.arc(x, y, ev.type.includes('Kill') ? 5 : 4, 0, Math.PI * 2)
            ctx.fill()
          }
          
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 1
          ctx.stroke()
        })
      })
    }
  }, [canvasSize, matchData, heatmapData, activeHeatmap, timeProgress, showBots, showPaths, showEvents, showHumansOnly, filterMap])

  // Re-render on state changes
  useEffect(() => { renderCanvas() }, [renderCanvas])

  /* ── Filtered matches ── */
  const filteredMatches = useMemo(() => {
    if (!matchIndex) return []
    return matchIndex.filter(m => {
      if (filterMap !== 'all' && m.map_id !== filterMap) return false
      if (filterDay !== 'all' && m.day !== filterDay) return false
      if (searchQuery && !m.match_id_clean.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    }).sort((a, b) => b.num_events - a.num_events)
  }, [matchIndex, filterMap, filterDay, searchQuery])

  /* ── Helpers ── */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const currentMapForHeatmap = filterMap !== 'all' ? filterMap : 'AmbroseValley'

  /* ── Aggregate stats ── */
  const aggStats = useMemo(() => {
    if (!matchIndex) return null
    const filtered = filteredMatches
    return {
      matches: filtered.length,
      humans: new Set(filtered.flatMap(m => [])).size, // approximate
      totalKills: filtered.reduce((s, m) => s + m.kills, 0),
      totalDeaths: filtered.reduce((s, m) => s + m.deaths, 0),
    }
  }, [filteredMatches])

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="app">
          <div className="loading" style={{width:'100%'}}>
            <div className="loading-spinner"></div>
            Loading LILA BLACK data...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* ── SIDEBAR ── */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h1>LILA BLACK</h1>
            <p>Player Journey Visualizer</p>
          </div>
          
          {/* Filters */}
          <div className="sidebar-section">
            <h3>Filters</h3>
            <div className="filter-row">
              <select value={filterMap} onChange={e => { setFilterMap(e.target.value); setSelectedMatch(null) }}>
                <option value="all">All Maps</option>
                <option value="AmbroseValley">Ambrose Valley</option>
                <option value="GrandRift">Grand Rift</option>
                <option value="Lockdown">Lockdown</option>
              </select>
              <select value={filterDay} onChange={e => { setFilterDay(e.target.value); setSelectedMatch(null) }}>
                <option value="all">All Days</option>
                <option value="February_10">Feb 10</option>
                <option value="February_11">Feb 11</option>
                <option value="February_12">Feb 12</option>
                <option value="February_13">Feb 13</option>
                <option value="February_14">Feb 14</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Search match ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Visualization Options */}
          <div className="sidebar-section">
            <h3>Display</h3>
            <div className="toggle-row">
              <label><input type="checkbox" checked={showPaths} onChange={e => setShowPaths(e.target.checked)} /> Player Paths</label>
            </div>
            <div className="toggle-row">
              <label><input type="checkbox" checked={showEvents} onChange={e => setShowEvents(e.target.checked)} /> Event Markers</label>
            </div>
            <div className="toggle-row">
              <label><input type="checkbox" checked={showBots} onChange={e => setShowBots(e.target.checked)} /> Show Bots</label>
            </div>
            <div className="toggle-row">
              <label><input type="checkbox" checked={showHumansOnly} onChange={e => setShowHumansOnly(e.target.checked)} /> Humans Only</label>
            </div>
          </div>
          
          {/* Heatmaps */}
          <div className="sidebar-section">
            <h3>Heatmap Overlay</h3>
            <div className="btn-group">
              <button
                className={`btn ${activeHeatmap === null ? 'active' : ''}`}
                onClick={() => setActiveHeatmap(null)}
              >Off</button>
              {HEATMAP_TYPES.map(ht => (
                <button
                  key={ht.key}
                  className={`btn ${activeHeatmap === ht.key ? 'active' : ''}`}
                  onClick={() => setActiveHeatmap(activeHeatmap === ht.key ? null : ht.key)}
                  style={activeHeatmap === ht.key ? { background: `rgb(${ht.color.join(',')})`, borderColor: `rgb(${ht.color.join(',')})` } : {}}
                >{ht.label}</button>
              ))}
            </div>
            {activeHeatmap && !matchData && (
              <p style={{ fontSize: 10, color: '#666', marginTop: 6 }}>
                Showing {currentMapForHeatmap} • Select a map filter to change
              </p>
            )}
          </div>
          
          {/* Match List */}
          <div className="sidebar-section" style={{ padding: '8px 16px 4px' }}>
            <h3>Matches ({filteredMatches.length})</h3>
          </div>
          <div className="sidebar-scroll">
            <div style={{ padding: '0 16px 16px' }}>
              {filteredMatches.slice(0, 100).map(match => (
                <div
                  key={match.match_id}
                  className={`match-item ${selectedMatch?.match_id === match.match_id ? 'selected' : ''}`}
                  onClick={() => setSelectedMatch(match)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="match-map">{match.map_id}</span>
                    <span style={{ color: '#666', fontSize: 10 }}>{match.day.replace('February_', 'Feb ')}</span>
                  </div>
                  <div className="match-meta">
                    <span>👤 {match.num_humans}H + {match.num_bots}B</span>
                    <span>⚔️ {match.kills}</span>
                    <span>💀 {match.deaths}</span>
                    <span>⏱ {formatTime(match.duration_seconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Player List (when match selected) */}
          {matchData && (
            <div className="sidebar-section" style={{ maxHeight: 200, overflowY: 'auto', borderTop: '1px solid #ff4444' }}>
              <h3>Players ({matchData.players.filter(p => !p.is_bot).length}H + {matchData.players.filter(p => p.is_bot).length}B)</h3>
              {matchData.players
                .sort((a, b) => a.is_bot - b.is_bot)
                .map((player, idx) => (
                  <div key={player.user_id} className="player-item">
                    <div className="player-dot" style={{ background: getPlayerColor(idx, player.is_bot) }}></div>
                    <span className={`player-tag ${player.is_bot ? 'bot' : 'human'}`}>
                      {player.is_bot ? 'BOT' : 'HUMAN'}
                    </span>
                    <span className="player-id">{player.user_id}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
        
        {/* ── MAIN AREA ── */}
        <div className="main">
          {/* Top bar */}
          <div className="topbar">
            <div className="topbar-info">
              {matchData ? (
                <>
                  <span>{matchData.map_id}</span> • {matchData.day.replace('February_', 'Feb ')} • 
                  Match <span>{matchData.match_id.substring(0, 8)}...</span> • 
                  {formatTime(timeProgress * matchData.duration)} / {formatTime(matchData.duration)}
                </>
              ) : (
                <>
                  <span>LILA BLACK</span> • {filteredMatches.length} matches loaded • 
                  {activeHeatmap ? `Heatmap: ${HEATMAP_TYPES.find(h => h.key === activeHeatmap)?.label}` : 'Select a match to begin'}
                </>
              )}
            </div>
            <div className="stats-bar">
              <div className="stat">
                <div className="stat-val">{filteredMatches.length}</div>
                <div className="stat-label">Matches</div>
              </div>
              <div className="stat">
                <div className="stat-val">{filteredMatches.reduce((s, m) => s + m.kills, 0)}</div>
                <div className="stat-label">Kills</div>
              </div>
              <div className="stat">
                <div className="stat-val">{filteredMatches.reduce((s, m) => s + m.deaths, 0)}</div>
                <div className="stat-label">Deaths</div>
              </div>
            </div>
          </div>
          
          {/* Canvas */}
          <div className="canvas-wrapper" ref={wrapperRef}>
            {matchLoading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                Loading match data...
              </div>
            ) : !matchData && !activeHeatmap ? (
              <div className="empty-state">
                <h2>Select a Match</h2>
                <p>Choose a match from the sidebar to visualize player journeys, or enable a heatmap overlay to see aggregate data across all matches.</p>
              </div>
            ) : (
              <canvas ref={canvasRef} width={canvasSize} height={canvasSize} style={{ width: canvasSize, height: canvasSize }} />
            )}
            
            {/* Legend */}
            {(matchData || activeHeatmap) && (
              <div className="legend">
                <h4>Legend</h4>
                {showEvents && matchData && Object.entries(EVENT_COLORS).map(([type, color]) => (
                  <div key={type} className="legend-item">
                    <div className="legend-color" style={{ background: color }}></div>
                    <span>{type}</span>
                  </div>
                ))}
                {matchData && (
                  <>
                    <div className="legend-item">
                      <div className="legend-color" style={{ background: '#44aaff' }}></div>
                      <span>Human paths</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ background: '#555' }}></div>
                      <span>Bot paths</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Timeline */}
          {matchData && (
            <div className="timeline">
              <div className="timeline-controls">
                <button
                  className={`timeline-btn ${isPlaying ? 'playing' : ''}`}
                  onClick={() => {
                    if (timeProgress >= 1) setTimeProgress(0)
                    setIsPlaying(!isPlaying)
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button className="timeline-btn" onClick={() => { setTimeProgress(0); setIsPlaying(false) }}>
                  ⏮
                </button>
                <button className="timeline-btn" onClick={() => { setTimeProgress(1); setIsPlaying(false) }}>
                  ⏭
                </button>
              </div>
              <div className="timeline-slider">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={timeProgress}
                  onChange={e => { setTimeProgress(parseFloat(e.target.value)); setIsPlaying(false) }}
                />
              </div>
              <div className="speed-control">
                {[0.5, 1, 2, 5, 10].map(s => (
                  <button
                    key={s}
                    className={`speed-btn ${playSpeed === s ? 'active' : ''}`}
                    onClick={() => setPlaySpeed(s)}
                  >{s}x</button>
                ))}
              </div>
              <div className="timeline-time">
                {formatTime(timeProgress * matchData.duration)} / {formatTime(matchData.duration)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
