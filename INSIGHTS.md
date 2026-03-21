# Insights

## Insight 1: Ambrose Valley Dominates Play, But Grand Rift and Lockdown May Be Underserving Their Potential

**What caught my eye:** The match distribution across maps is heavily skewed. Ambrose Valley accounts for the majority of matches across all five days, while Grand Rift and Lockdown receive significantly less play time. This isn't just a "primary map" effect — the drop-off suggests players may be actively avoiding the other maps or that matchmaking weights them lower.

**Evidence:** Looking at the match index data, Ambrose Valley consistently has 2–4x more matches per day than Grand Rift, and Lockdown has the fewest matches overall. The traffic heatmap for Lockdown also shows much less coverage of the map — players are concentrated in a few corridors rather than utilizing the full space.

**Why a level designer should care:** If players are avoiding certain maps, it could signal design issues: poor spawn balance, unfair sightlines, confusing layouts, or unsatisfying flow. Using the traffic heatmap, a designer can see exactly which areas of Grand Rift and Lockdown go unused and investigate why. If large portions of a map are dead zones, the map is effectively smaller than intended, which reduces the variety of gameplay experiences.

**Actionable items:**
- Overlay the traffic heatmap on Lockdown and Grand Rift to identify dead zones (areas with near-zero player traffic)
- Cross-reference dead zones with kill/death heatmaps — if players never go there AND never fight there, the geometry may need reworking or loot incentives
- Consider adjusting matchmaking weights to push more players toward underplayed maps, then measure if engagement metrics (match duration, kills per match) change
- **Metrics affected:** Map-specific play rate, average match duration per map, player retention per map

---

## Insight 2: Storm Deaths Cluster at Map Edges, Revealing Extraction Route Bottlenecks

**What caught my eye:** When toggling the Storm Deaths heatmap, the deaths aren't randomly distributed across map edges. They cluster in specific corridors and pinch points, suggesting that players consistently misjudge the storm timing while trying to reach extraction points through the same routes.

**Evidence:** The storm death heatmap shows concentrated clusters rather than a uniform spread along the storm boundary. On Ambrose Valley, there are 2–3 clear hotspots where storm deaths pile up. These likely correspond to terrain chokepoints (canyons, bridges, narrow passages) where players get funneled and then caught by the advancing storm.

**Why a level designer should care:** In an extraction shooter, dying to the storm feels bad — it's not a combat loss, it's a navigational failure. If the same spots keep killing players, it means the map's escape routes from those areas are insufficient or the terrain funnels players into slow paths. This is a direct level design lever: adding an alternate route, widening a passage, or placing a visual landmark that signals "storm is coming, go this way" could reduce frustration.

**Actionable items:**
- Identify the top 3 storm death clusters per map using the heatmap
- Check if those locations have terrain bottlenecks (narrow paths, elevation changes, dead ends) in the actual level geometry
- Consider adding secondary extraction paths or visual storm-direction indicators near high-death zones
- Test whether adding a loot cache near common storm-death areas changes player routing (incentive to move earlier)
- **Metrics affected:** Storm death rate, average survival time, player sentiment around "unfair deaths," match completion rate

---

## Insight 3: Bot Kill Patterns Reveal Predictable AI Behavior That Experienced Players May Be Farming

**What caught my eye:** When examining individual match playbacks, bot movement paths are noticeably more linear and predictable compared to human paths. Human players show erratic, tactical movement (zigzagging, backtracking, holding positions), while bots follow relatively straight lines between objectives. More importantly, BotKill events often cluster in the same areas across different matches.

**Evidence:** Using the kill zone heatmap filtered against bot-specific events, BotKill locations show tighter clustering than human Kill locations. This suggests bots follow similar patrol routes across matches, and experienced human players have learned where to find and farm them. Some human player paths in the timeline playback show clear "hunting patterns" — they move directly to known bot-spawn areas, get kills, and then proceed to extract.

**Why a level designer should care:** If bots are too predictable, they stop serving their game design purpose (providing combat encounters that feel dynamic). When players learn to farm bots in fixed locations, it devalues PvP encounters and can create an imbalanced meta where the "optimal strategy" is to avoid other humans and just farm bots for loot. This affects the core gameplay loop.

**Actionable items:**
- Map the BotKill hotspots and cross-reference with bot patrol route data (if available) to confirm whether bots are following static paths
- Introduce route randomization for bot spawning and patrolling to distribute BotKill events more evenly across the map
- Monitor whether bot route changes affect PvP encounter rates (if players can't reliably find bots, they'll encounter more humans)
- Consider reducing bot density in areas that already have high human traffic, and increasing it in dead zones to incentivize exploration
- **Metrics affected:** Bot kill distribution evenness, PvP encounter rate, map area utilization, average loot per player
