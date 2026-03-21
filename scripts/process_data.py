"""
LILA BLACK Data Processor
Reads parquet files from player_data/ and outputs processed JSON for the visualization tool.
Run this locally: python process_data.py
Requires: pip install pyarrow pandas
"""

import pyarrow.parquet as pq
import pandas as pd
import os
import json
import base64
from pathlib import Path
from PIL import Image
import io

DATA_DIR = "player_data/player_data"
OUTPUT_DIR = "public/data"

MAP_CONFIG = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473},
    "GrandRift": {"scale": 581, "origin_x": -290, "origin_z": -290},
    "Lockdown": {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

DAYS = ["February_10", "February_11", "February_12", "February_13", "February_14"]


def is_bot(user_id):
    """Bots have short numeric IDs, humans have UUIDs"""
    try:
        int(user_id)
        return True
    except ValueError:
        return False


def world_to_uv(x, z, map_id):
    """Convert world coordinates to UV (0-1 range) for minimap"""
    cfg = MAP_CONFIG[map_id]
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    return u, v


def world_to_pixel(x, z, map_id, img_size=1024):
    """Convert world coordinates to pixel coordinates on minimap"""
    u, v = world_to_uv(x, z, map_id)
    px = u * img_size
    py = (1 - v) * img_size
    return round(px, 2), round(py, 2)


def load_all_data():
    """Load all parquet files into a single DataFrame"""
    frames = []
    for day in DAYS:
        day_dir = os.path.join(DATA_DIR, day)
        if not os.path.isdir(day_dir):
            continue
        for fname in os.listdir(day_dir):
            filepath = os.path.join(day_dir, fname)
            try:
                table = pq.read_table(filepath)
                df = table.to_pandas()
                df["day"] = day
                df["filename"] = fname
                frames.append(df)
            except Exception as e:
                print(f"  Skipping {filepath}: {e}")
                continue
    
    combined = pd.concat(frames, ignore_index=True)
    
    # Decode event bytes to string
    combined["event"] = combined["event"].apply(
        lambda x: x.decode("utf-8") if isinstance(x, bytes) else str(x)
    )
    
    # Clean match_id (remove .nakama-0 suffix for cleaner display)
    combined["match_id_clean"] = combined["match_id"].str.replace(".nakama-0", "", regex=False)
    
    # Determine if bot
    combined["is_bot"] = combined["user_id"].apply(is_bot)
    
    # Convert timestamp to seconds within match (for timeline)
    combined["ts_ms"] = pd.to_datetime(combined["ts"]).astype("int64") // 10**6
    
    # Group by match to get relative time
    combined["ts_seconds"] = combined.groupby("match_id")["ts_ms"].transform(
        lambda x: (x - x.min()) / 1000.0
    )
    
    # Convert world coords to pixel coords
    pixel_coords = combined.apply(
        lambda row: world_to_pixel(row["x"], row["z"], row["map_id"]),
        axis=1,
        result_type="expand"
    )
    combined["px"] = pixel_coords[0]
    combined["py"] = pixel_coords[1]
    
    print(f"Loaded {len(combined)} total events")
    print(f"Unique matches: {combined['match_id'].nunique()}")
    print(f"Unique players: {combined['user_id'].nunique()}")
    print(f"Maps: {combined['map_id'].unique().tolist()}")
    print(f"Events: {combined['event'].value_counts().to_dict()}")
    
    return combined


def generate_match_index(df):
    """Create a match index for the dropdown/filter"""
    matches = []
    for match_id, group in df.groupby("match_id"):
        match_info = {
            "match_id": match_id,
            "match_id_clean": group["match_id_clean"].iloc[0],
            "map_id": group["map_id"].iloc[0],
            "day": group["day"].iloc[0],
            "num_humans": group[~group["is_bot"]]["user_id"].nunique(),
            "num_bots": group[group["is_bot"]]["user_id"].nunique(),
            "num_events": len(group),
            "duration_seconds": round(group["ts_seconds"].max(), 1),
            "kills": int(group["event"].isin(["Kill", "BotKill"]).sum()),
            "deaths": int(group["event"].isin(["Killed", "BotKilled", "KilledByStorm"]).sum()),
        }
        matches.append(match_info)
    return matches


def generate_match_data(df, match_id):
    """Generate detailed data for a single match"""
    match_df = df[df["match_id"] == match_id].copy()
    
    players = []
    for user_id, player_df in match_df.groupby("user_id"):
        player_df = player_df.sort_values("ts_seconds")
        
        # Build path (position events only)
        pos_events = ["Position", "BotPosition"]
        path_df = player_df[player_df["event"].isin(pos_events)]
        
        path = []
        for _, row in path_df.iterrows():
            path.append({
                "px": row["px"],
                "py": row["py"],
                "t": round(row["ts_seconds"], 2),
            })
        
        # Build events (non-position)
        events = []
        event_df = player_df[~player_df["event"].isin(pos_events)]
        for _, row in event_df.iterrows():
            events.append({
                "px": row["px"],
                "py": row["py"],
                "t": round(row["ts_seconds"], 2),
                "type": row["event"],
            })
        
        players.append({
            "user_id": user_id,
            "is_bot": bool(player_df["is_bot"].iloc[0]),
            "path": path,
            "events": events,
        })
    
    return {
        "match_id": match_id,
        "map_id": match_df["map_id"].iloc[0],
        "day": match_df["day"].iloc[0],
        "duration": round(match_df["ts_seconds"].max(), 1),
        "players": players,
    }


def generate_heatmap_data(df):
    """Generate aggregated heatmap data for kills, deaths, traffic per map"""
    heatmaps = {}
    
    for map_id in df["map_id"].unique():
        map_df = df[df["map_id"] == map_id]
        
        # Kill locations
        kill_events = map_df[map_df["event"].isin(["Kill", "BotKill"])]
        kills = [{"px": r["px"], "py": r["py"]} for _, r in kill_events.iterrows()]
        
        # Death locations  
        death_events = map_df[map_df["event"].isin(["Killed", "BotKilled", "KilledByStorm"])]
        deaths = [{"px": r["px"], "py": r["py"]} for _, r in death_events.iterrows()]
        
        # Storm death locations
        storm_events = map_df[map_df["event"] == "KilledByStorm"]
        storm_deaths = [{"px": r["px"], "py": r["py"]} for _, r in storm_events.iterrows()]
        
        # Loot locations
        loot_events = map_df[map_df["event"] == "Loot"]
        loots = [{"px": r["px"], "py": r["py"]} for _, r in loot_events.iterrows()]
        
        # Traffic (sampled position events - take every 3rd to reduce size)
        pos_events = map_df[map_df["event"].isin(["Position", "BotPosition"])]
        sampled = pos_events.iloc[::3]
        traffic = [{"px": r["px"], "py": r["py"]} for _, r in sampled.iterrows()]
        
        heatmaps[map_id] = {
            "kills": kills,
            "deaths": deaths,
            "storm_deaths": storm_deaths,
            "loots": loots,
            "traffic": traffic,
        }
        
        print(f"  {map_id}: {len(kills)} kills, {len(deaths)} deaths, {len(storm_deaths)} storm, {len(loots)} loots, {len(traffic)} traffic points")
    
    return heatmaps


def generate_daily_stats(df):
    """Generate per-day aggregate stats"""
    stats = []
    for day in DAYS:
        day_df = df[df["day"] == day]
        if day_df.empty:
            continue
        stats.append({
            "day": day,
            "matches": day_df["match_id"].nunique(),
            "unique_humans": day_df[~day_df["is_bot"]]["user_id"].nunique(),
            "total_events": len(day_df),
            "kills": int(day_df["event"].isin(["Kill", "BotKill"]).sum()),
            "deaths": int(day_df["event"].isin(["Killed", "BotKilled", "KilledByStorm"]).sum()),
            "storm_deaths": int((day_df["event"] == "KilledByStorm").sum()),
            "loots": int((day_df["event"] == "Loot").sum()),
            "map_distribution": day_df.groupby("map_id")["match_id"].nunique().to_dict(),
        })
    return stats


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Loading all data...")
    df = load_all_data()
    
    print("\nGenerating match index...")
    match_index = generate_match_index(df)
    with open(os.path.join(OUTPUT_DIR, "match_index.json"), "w") as f:
        json.dump(match_index, f)
    print(f"  {len(match_index)} matches indexed")
    
    print("\nGenerating heatmap data...")
    heatmaps = generate_heatmap_data(df)
    with open(os.path.join(OUTPUT_DIR, "heatmaps.json"), "w") as f:
        json.dump(heatmaps, f)
    
    print("\nGenerating daily stats...")
    daily_stats = generate_daily_stats(df)
    with open(os.path.join(OUTPUT_DIR, "daily_stats.json"), "w") as f:
        json.dump(daily_stats, f)
    
    print("\nGenerating individual match data...")
    os.makedirs(os.path.join(OUTPUT_DIR, "matches"), exist_ok=True)
    for i, match_id in enumerate(df["match_id"].unique()):
        match_data = generate_match_data(df, match_id)
        safe_id = match_id.replace(".", "_")
        with open(os.path.join(OUTPUT_DIR, "matches", f"{safe_id}.json"), "w") as f:
            json.dump(match_data, f)
        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1} matches...")
    
    print(f"\nDone! {len(df['match_id'].unique())} match files generated.")
    print(f"Output in: {OUTPUT_DIR}/")
    print("\nFiles created:")
    print(f"  {OUTPUT_DIR}/match_index.json")
    print(f"  {OUTPUT_DIR}/heatmaps.json")
    print(f"  {OUTPUT_DIR}/daily_stats.json")
    print(f"  {OUTPUT_DIR}/matches/<match_id>.json (one per match)")


if __name__ == "__main__":
    main()
