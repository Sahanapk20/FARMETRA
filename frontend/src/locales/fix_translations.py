import re

# Read the file
with open('translations.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Languages to add (12 missing from landingExtended)
missing_langs = ['kn', 'or', 'as', 'sd', 'ks', 'ne', 'kok', 'doi', 'mai', 'sa', 'mni', 'bho']

# Read the landing.ts modular file for translations
with open('translations/landing.ts', 'r', encoding='utf-8') as f:
    landing_content = f.read()

# Extract each language from the modular file
def extract_lang_section(content, lang_code):
    pattern = rf"{lang_code}: \{{(?:[^{{}}]|\{{[^{{}}]*\}})*\}}"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(0)
    return None

# Find where to insert - after the 'pa' (Punjabi) section in landingExtended
# First find the pa section end
pa_pattern = r"(    pa: \{(?:[^{}]|\{[^}]*\})*?madeWithLove: '.*?',\s*\},)"
pa_match = re.search(pa_pattern, content, re.DOTALL)

if pa_match:
    insert_pos = pa_match.end()
    
    # Build new language sections
    new_sections = []
    for lang in missing_langs:
        section = extract_lang_section(landing_content, lang)
        if section:
            new_sections.append(section)
    
    # Insert the new sections
    if new_sections:
        new_content = content[:insert_pos] + '\n    ' + '\n    '.join(new_sections) + content[insert_pos:]
        
        with open('translations.ts', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Added {len(new_sections)} languages to landingExtended")
    else:
        print("No new sections to add")
else:
    print("Could not find pa section")
