import requests
import chess.pgn
import io
import json
import os

def get_category(eco, name):
    if "gambit" in name.lower():
        return "gambit"
    if not eco:
        return "other"
    first = eco[0].upper()
    if first == 'A':
        return "flank"
    if first == 'B' or first == 'C':
        return "e4"
    if first == 'D' or first == 'E':
        return "d4"
    return "other"

def process_tsv(url):
    print(f"Fetching {url}...")
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Failed to fetch {url}")
        return []
    
    lines = response.text.strip().split('\n')
    header = lines[0].split('\t')
    data = []
    
    for line in lines[1:]:
        parts = line.split('\t')
        if len(parts) < 3:
            continue
        
        eco = parts[0]
        name = parts[1]
        pgn_str = parts[2]
        
        try:
            # Calculate FEN
            game = chess.pgn.read_game(io.StringIO(pgn_str))
            board = game.board()
            for move in game.mainline_moves():
                board.push(move)
            
            fen = board.fen()
            
            data.append({
                "name": name,
                "eco": eco,
                "moves": pgn_str,
                "fen": fen,
                "category": get_category(eco, name),
                "description": "" # Save space, description can be generated or fetched later if needed
            })
        except Exception as e:
            # print(f"Error processing {name}: {e}")
            pass
            
    return data

def main():
    base_url = "https://raw.githubusercontent.com/lichess-org/chess-openings/master/"
    files = ["a.tsv", "b.tsv", "c.tsv", "d.tsv", "e.tsv"]
    
    all_openings = []
    for f in files:
        all_openings.extend(process_tsv(base_url + f))
    
    output_path = os.path.join("frontend", "static", "js", "opening_data.js")
    
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("// Automatically generated chess openings data\n")
        out.write("const OPENINGS_DATA = ")
        json.dump(all_openings, out, ensure_ascii=False, indent=2)
        out.write(";\n")
    
    print(f"Done! Saved {len(all_openings)} openings to {output_path}")

if __name__ == "__main__":
    main()
