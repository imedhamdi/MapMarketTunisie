#!/usr/bin/env python3
"""
Script pour supprimer TOUTES les media queries de TOUS les fichiers CSS.
Cela permet de repartir sur une base propre sans conflits.
"""

import os
import re
from pathlib import Path

# Dossier contenant les fichiers CSS
CSS_DIR = Path('public/css')

def remove_all_media_queries(content):
    """
    Supprime toutes les @media queries du contenu CSS.
    Gère les media queries imbriquées et complexes.
    """
    lines = content.split('\n')
    result_lines = []
    inside_media = False
    brace_count = 0
    media_start_brace_count = 0
    
    for i, line in enumerate(lines):
        # Détecter le début d'une @media query
        if '@media' in line:
            inside_media = True
            media_start_brace_count = brace_count
            # Compter les accolades sur cette ligne
            brace_count += line.count('{')
            brace_count -= line.count('}')
            continue
        
        if inside_media:
            # Compter les accolades
            brace_count += line.count('{')
            brace_count -= line.count('}')
            
            # Si on a fermé toutes les accolades de la media query
            if brace_count <= media_start_brace_count:
                inside_media = False
                media_start_brace_count = 0
            continue
        
        # Si on n'est pas dans une media query, on garde la ligne
        result_lines.append(line)
        brace_count += line.count('{')
        brace_count -= line.count('}')
    
    return '\n'.join(result_lines)

def clean_empty_lines(content):
    """Nettoie les lignes vides consécutives"""
    lines = content.split('\n')
    result = []
    prev_empty = False
    
    for line in lines:
        is_empty = line.strip() == ''
        
        # Garder max 2 lignes vides consécutives
        if is_empty:
            if not prev_empty:
                result.append(line)
            prev_empty = True
        else:
            result.append(line)
            prev_empty = False
    
    return '\n'.join(result)

def process_css_file(file_path):
    """Traite un fichier CSS pour supprimer les media queries"""
    print(f"📄 Traitement: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_lines = len(content.split('\n'))
        
        # Compter les media queries avant
        media_count = content.count('@media')
        
        if media_count == 0:
            print(f"   ✓ Aucune media query à supprimer")
            return
        
        # Supprimer les media queries
        cleaned_content = remove_all_media_queries(content)
        
        # Nettoyer les lignes vides excessives
        cleaned_content = clean_empty_lines(cleaned_content)
        
        new_lines = len(cleaned_content.split('\n'))
        
        # Sauvegarder
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        
        print(f"   ✅ {media_count} media queries supprimées")
        print(f"   📊 {original_lines} → {new_lines} lignes ({original_lines - new_lines} supprimées)")
        
    except Exception as e:
        print(f"   ❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("=" * 60)
    print("🧹 NETTOYAGE COMPLET DES MEDIA QUERIES CSS")
    print("=" * 60)
    print()
    
    # Créer des backups
    print("💾 Création des backups...")
    os.system('cp -r public/css public/css.backup.$(date +%Y%m%d_%H%M%S)')
    print("   ✓ Backup créé dans public/css.backup.YYYYMMDD_HHMMSS")
    print()
    
    # Trouver tous les fichiers CSS
    css_files = []
    
    # Fichiers CSS à la racine
    for file in CSS_DIR.glob('*.css'):
        css_files.append(file)
    
    # Fichiers CSS dans modules/
    modules_dir = CSS_DIR / 'modules'
    if modules_dir.exists():
        for file in modules_dir.glob('*.css'):
            css_files.append(file)
    
    # Fichiers CSS dans tokens/
    tokens_dir = CSS_DIR / 'tokens'
    if tokens_dir.exists():
        for file in tokens_dir.glob('*.css'):
            css_files.append(file)
    
    print(f"📁 {len(css_files)} fichiers CSS trouvés")
    print()
    
    total_media_removed = 0
    total_lines_removed = 0
    
    # Traiter chaque fichier
    for css_file in sorted(css_files):
        relative_path = css_file.relative_to(CSS_DIR)
        
        # Lire le fichier
        with open(css_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        media_count = content.count('@media')
        
        if media_count > 0:
            original_lines = len(content.split('\n'))
            process_css_file(css_file)
            
            # Relire pour calculer les stats
            with open(css_file, 'r', encoding='utf-8') as f:
                new_content = f.read()
            new_lines = len(new_content.split('\n'))
            
            total_media_removed += media_count
            total_lines_removed += (original_lines - new_lines)
        else:
            print(f"📄 {relative_path}")
            print(f"   ✓ Aucune media query")
    
    print()
    print("=" * 60)
    print("✅ NETTOYAGE TERMINÉ")
    print("=" * 60)
    print(f"📊 Media queries supprimées: {total_media_removed}")
    print(f"📊 Lignes supprimées: {total_lines_removed}")
    print()
    print("⚠️  ATTENTION:")
    print("   - Tous les styles responsive ont été supprimés")
    print("   - Il faudra recréer les media queries proprement")
    print("   - Les backups sont dans public/css.backup.YYYYMMDD_HHMMSS/")
    print()
    print("🎯 PROCHAINE ÉTAPE:")
    print("   Recréer les media queries essentielles de façon organisée")
    print("=" * 60)

if __name__ == '__main__':
    main()
