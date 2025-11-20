#!/usr/bin/env python3
"""
Script pour consolider TOUTES les media queries fragmentées du modal de détails.
Supprime toutes les media queries 400px et 640px fragmentées avant les consolidées finales.
"""

import re

# Lire le fichier
with open('public/css/modules/modal-drawer.css', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

print(f"📊 Fichier original: {len(lines)} lignes")

# Trouver toutes les media queries @media (max-width: 400px) dans la zone des détails (lignes 1800-2420)
# et @media (max-width: 640px) fragmentées
media_queries_400_to_remove = [
    1840, 2022, 2039, 2054, 2068, 2109, 2170, 2183, 2199, 
    2214, 2228, 2276, 2296, 2313, 2325, 2339, 2363
]

# Garder seulement les media queries consolidées :
# - ligne 2421 : @media (max-width: 960px)
# - ligne 2441 : @media (max-width: 640px) [CONSOLIDÉE]
# - ligne 2650 : @media (max-width: 400px) [CONSOLIDÉE]

def find_media_block_end(lines, start_idx):
    """Trouve la fin d'un bloc @media en comptant les accolades"""
    brace_count = 0
    started = False
    idx = start_idx
    
    while idx < len(lines):
        line = lines[idx].strip()
        
        if '@media' in lines[idx]:
            started = True
            
        if started:
            brace_count += line.count('{')
            brace_count -= line.count('}')
            
            if brace_count == 0 and '}' in line:
                return idx
                
        idx += 1
    return idx

# Marquer les blocs à supprimer
to_delete = set()
for start_line in media_queries_400_to_remove:
    end_line = find_media_block_end(lines, start_line - 1)
    for i in range(start_line - 1, end_line + 1):
        to_delete.add(i)
    print(f"  🗑️  Suppression bloc @media lignes {start_line}-{end_line + 1}")

print(f"\n🗑️  Total lignes à supprimer: {len(to_delete)}")

# Créer le nouveau contenu sans les lignes marquées
new_lines = [line for i, line in enumerate(lines) if i not in to_delete]

# Sauvegarder
with open('public/css/modules/modal-drawer.css', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"\n✅ Fichier nettoyé!")
print(f"📊 Lignes avant: {len(lines)}")
print(f"📊 Lignes après: {len(new_lines)}")
print(f"📊 Réduction: {len(lines) - len(new_lines)} lignes")
