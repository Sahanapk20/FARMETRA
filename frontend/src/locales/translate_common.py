import re
import time
from deep_translator import GoogleTranslator

def main():
    with open('translations/common.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    en_pattern = r"  en: \{([\s\S]*?)\n  \},"
    en_match = re.search(en_pattern, content)
    if not en_match:
        print("Could not find English section")
        return
    
    en_content = en_match.group(1)
    en_dict = {}
    for line in en_content.split('\n'):
        line = line.strip()
        if not line: continue
        match = re.match(r"([a-zA-Z0-9_]+):\s*'(.*)',?", line)
        if match:
            en_dict[match.group(1)] = match.group(2)

    langs = ['hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'ur', 'or', 'as', 'sd', 'ks', 'ne', 'kok', 'doi', 'mai']
    
    lang_map = {
        'or': 'or', 
        'as': 'as', 
        'sd': 'sd', 
        'ks': 'ur', # fallback ks to urdu since kashmiri might fail
        'ne': 'ne', 
        'kok': 'mr', # fallback konkani to marathi
        'doi': 'hi', # fallback dogri to hindi
        'mai': 'mai', 
        'sa': 'sa', 
        'mni': 'hi', 
        'bho': 'bho', 
        'kn': 'kn',
        'ml': 'ml',
        'pa': 'pa',
        'ur': 'ur',
        'hi': 'hi',
        'bn': 'bn',
        'te': 'te',
        'mr': 'mr',
        'ta': 'ta',
        'gu': 'gu'
    }

    new_content = content
    
    for lang in langs:
        print(f"Processing {lang}...")
        lang_pattern = rf"  {lang}: \{{(.*?)\n  \}}"
        match = re.search(lang_pattern, new_content, re.DOTALL)
        if not match:
            print(f"Skipping {lang}, block not found.")
            continue
            
        lang_content = match.group(1)
        
        existing_keys = set()
        for line in lang_content.split('\n'):
            line = line.strip()
            if not line: continue
            k_match = re.match(r"([a-zA-Z0-9_]+):", line)
            if k_match:
                existing_keys.add(k_match.group(1))
                
        missing_keys = []
        for key in en_dict:
            if key not in existing_keys:
                missing_keys.append(key)
                
        if not missing_keys:
            print(f"  No missing keys for {lang}.")
            continue
            
        print(f"  Missing {len(missing_keys)} keys for {lang}.")
        
        g_lang = lang_map.get(lang, lang)
        translator = GoogleTranslator(source='en', target=g_lang)
        
        added_lines = []
        for key in missing_keys:
            en_text = en_dict[key]
            text_to_translate = en_text.replace("\\'", "'")
            try:
                result = translator.translate(text_to_translate)
                trans_text = result.replace("'", "\\'")
                added_lines.append(f"    {key}: '{trans_text}'")
                time.sleep(0.1)
            except Exception as e:
                print(f"  Failed to translate '{text_to_translate}' to {lang}: {e}")
                added_lines.append(f"    {key}: '{en_text}'")
                
        if added_lines:
            new_lang_content = lang_content
            if new_lang_content.strip() and not new_lang_content.rstrip().endswith(','):
                new_lang_content = new_lang_content.rstrip() + ',' + '\n'
            elif not new_lang_content.endswith('\n'):
                new_lang_content += '\n'
                
            new_lang_content += ',\n'.join(added_lines)
            
            new_section = f"  {lang}: {{{new_lang_content}\n  }}"
            new_content = new_content[:match.start()] + new_section + new_content[match.end():]

    with open('translations/common.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Done!")

if __name__ == '__main__':
    main()
