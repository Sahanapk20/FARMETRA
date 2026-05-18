import re
import time
from deep_translator import GoogleTranslator

def main():
    with open('translations/common.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # English keys to translate
    en_keys = {
        'productDetails': 'Product Details',
        'originInfo': 'Origin Info',
        'reviewAndSubmit': 'Review & Submit',
        'enterInformationAboutTheProduct': 'Enter information about the product',
        'productName': 'Product Name',
        'eGOrganicWheat': 'e.g., Organic Wheat',
        'productType': 'Product Type',
        'selectType': 'Select type',
        'quantity': 'Quantity',
        'enterQuantity': 'Enter quantity',
        'units': 'Units',
        'weightTotalWeight': 'Weight (Total Weight)',
        'enterWeight': 'Enter weight',
        'kg': 'kg',
        'description': 'Description',
        'addAnyAdditionalDetailsAboutTheProduct': 'Add any additional details about the product...',
        'continueToOriginInfo': 'Continue to Origin Info',
        'back': 'Back',
        'originInformation': 'Origin Information',
        'whereWasThisProductSourcedFrom': 'Where was this product sourced from?',
        'farmSourceName': 'Farm / Source Name',
        'eGGoldenValleyFarms': 'e.g., Golden Valley Farms',
        'location': 'Location',
        'eGPunjabIndia': 'e.g., Punjab, India',
        'giTagGeographicalIndication': 'GI Tag (Geographical Indication)',
        'eGDarjeelingTeaBasmatiRice': 'e.g., Darjeeling Tea, Basmati Rice',
        'harvestDate': 'Harvest Date',
        'doYouHaveAnyCertificationsForThisProduct': 'Do you have any certifications for this product?',
        'yesIHaveCertificates': 'Yes, I have certificates',
        'noIDontHaveAny': "No, I don't have any",
        'selectYesIfYouHaveOrganicFSSAIOrOtherCertifications': 'Select Yes if you have organic, FSSAI, or other certifications',
        'greatSelectYourCertificationsBelowAndUploadTheDocuments': 'Great! Select your certifications below and upload the documents',
        'youCanProceedWithoutCertificationsTheyCanBeAddedLater': 'You can proceed without certifications. They can be added later.',
        'selectYourCertifications': 'Select Your Certifications',
        'uploadYourCertificateDocuments': 'Upload Your Certificate Documents',
        'pleaseUploadTheAuthenticCertificateDocumentsForVerification': 'Please upload the authentic certificate documents for verification.',
        'acceptedFormatsPDFJPGPNGMax5MBEach': 'Accepted formats: PDF, JPG, PNG (Max 5MB each)',
        'farmer': 'farmer',
        'createBatch': 'Create Batch',
        'analytics': 'Analytics',
        'settings': 'Settings',
    }

    # Languages that fell back to English - fix them
    # ks -> use urdu as fallback (Kashmiri)
    # ne -> Nepali (should work)
    # kok -> Konkani, use Marathi as fallback
    # doi -> Dogri, use Hindi as fallback
    # mai -> Maithili
    langs_to_fix = {
        'ks': 'ur',
        'ne': 'ne',
        'kok': 'mr',
        'doi': 'hi',
        'mai': 'hi',  # fallback to Hindi for Maithili
    }

    new_content = content

    for lang, g_lang in langs_to_fix.items():
        print(f"\nFixing {lang} (using Google target: {g_lang})...")
        lang_pattern = rf"  {lang}: \{{(.*?)\n  \}}"
        match = re.search(lang_pattern, new_content, re.DOTALL)
        if not match:
            print(f"  Skipping {lang}, block not found.")
            continue

        lang_content = match.group(1)

        # Find keys that still have English values
        keys_to_fix = []
        for line in lang_content.split('\n'):
            line = line.strip()
            for key, en_val in en_keys.items():
                en_escaped = en_val.replace("'", "\\'")
                if f"{key}: '{en_escaped}'" in line or f"{key}: '{en_val}'" in line:
                    keys_to_fix.append(key)

        if not keys_to_fix:
            print(f"  No English fallbacks found for {lang}.")
            continue

        print(f"  Found {len(keys_to_fix)} English fallbacks to translate.")
        translator = GoogleTranslator(source='en', target=g_lang)

        for key in keys_to_fix:
            en_val = en_keys[key]
            try:
                translated = translator.translate(en_val)
                translated_escaped = translated.replace("'", "\\'")
                # Replace the English value with the translated value
                old_line_1 = f"    {key}: '{en_val.replace(chr(39), chr(92)+chr(39))}'"
                old_line_2 = f"    {key}: '{en_val}'"
                new_line   = f"    {key}: '{translated_escaped}'"
                if old_line_1 in lang_content:
                    lang_content = lang_content.replace(old_line_1, new_line, 1)
                elif old_line_2 in lang_content:
                    lang_content = lang_content.replace(old_line_2, new_line, 1)
                print(f"    {key}: '{translated}'")
                time.sleep(0.2)
            except Exception as e:
                print(f"    FAILED {key}: {e}")

        new_section = f"  {lang}: {{{lang_content}\n  }}"
        new_content = new_content[:match.start()] + new_section + new_content[match.end():]

    with open('translations/common.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("\nDone!")

if __name__ == '__main__':
    main()
