#!/usr/bin/env python3
"""
Script pour consolider les media queries du modal de détails.
Supprime toutes les media queries fragmentées @media (max-width: 640px)
avant la ligne 2688 et garde uniquement la grande media query consolidée.
"""

import re

# Lire le fichier
with open('public/css/modules/modal-drawer.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lignes à supprimer (media queries fragmentées pour les détails)
# Ces lignes correspondent aux @media (max-width: 640px) avant la consolidée
media_queries_to_remove = [
    1745, 1761, 1773, 1789, 1821, 1862, 1901, 1995, 
    2101, 2124, 2151, 2171, 2199, 2230, 2255, 2278,
    2324, 2347, 2381, 2402, 2421, 2440, 2470, 2488,
    2515, 2539, 2557, 2576, 2607
]

# Marquer les blocs à supprimer
to_delete = set()
for start_line in media_queries_to_remove:
    # Trouver la fin du bloc @media
    brace_count = 0
    started = False
    idx = start_line - 1  # Convertir en index 0
    
    while idx < len(lines):
        line = lines[idx].strip()
        
        if '@media' in line:
            started = True
            
        if started:
            # Compter les accolades
            brace_count += line.count('{')
            brace_count -= line.count('}')
            
            to_delete.add(idx)
            
            # Si on a fermé toutes les accolades, on arrête
            if brace_count == 0 and '}' in line:
                break
                
        idx += 1

print(f"🗑️  Nombre de lignes à supprimer: {len(to_delete)}")

# Créer le nouveau contenu sans les lignes marquées
new_lines = [line for i, line in enumerate(lines) if i not in to_delete]

# Sauvegarder
with open('public/css/modules/modal-drawer.css', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"✅ Fichier nettoyé!")
print(f"📊 Lignes avant: {len(lines)}")
print(f"📊 Lignes après: {len(new_lines)}")
print(f"📊 Réduction: {len(lines) - len(new_lines)} lignes")
