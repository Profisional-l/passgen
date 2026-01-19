# **App Name**: Crypt Keeper

## Core Features:

- Registration: Allow new users to create an account by generating KDF salt, deriving keys, creating a vault, encrypting it, and sending it to the server.
- Vault Unlocking: Enable users to unlock their vault by retrieving ciphertext, salt, and parameters, deriving keys, decrypting the vault, storing it locally, and starting the auto-lock timer.
- Password Generation: Generate strong passwords using `crypto.getRandomValues()` with customizable length and character sets (lowercase, uppercase, digits, symbols), including the option to exclude specific characters.
- Encrypted Vault Storage: Securely store encrypted vaults locally using IndexedDB, including ciphertext, nonce, KDF salt, KDF parameters, and vault version.
- Vault Auto-Lock: Implement an auto-lock feature that clears the vault from memory and requires re-authentication after 3 minutes of inactivity (no clicks, input, scrolling, or navigation).
- Encrypted Backup Export/Import: Allow users to export an encrypted backup of their vault as a JSON file and restore it by uploading the file, entering their master password, decrypting the vault, and saving it locally.
- Conflict Resolution Tool: Implement a tool to determine whether an incoming version is newer than a stored version before accepting an update. This check occurs during PUT requests to the /api/vault route, returning a 409 conflict if necessary

## Style Guidelines:

- Primary color: Deep purple (#6750A4), evokes security, knowledge and discretion, key features of password management.
- Background color: Very dark grayish-purple (#141218), helps emphasize the information in the app.
- Accent color: Light purplish-blue (#84c5ef), can make the text, icons and animations visible
- Font pairing: 'Belleza' (sans-serif) for headlines and shorter texts, with its personality, and a style aligned to design and 'Alegreya' (serif) for body text, its literary feel will bring sophistication to the design
- Use simple, monochrome icons with a thin stroke to match the minimalist design. Icons should be easily recognizable and related to the function they represent (e.g., a key for password, a lock for security).
- Implement a clean, card-based layout with frosted glass effect panels to display vault entries and settings. Ensure content is well-spaced and easy to navigate on both desktop and mobile devices.
- Incorporate subtle animations for transitions and interactions, such as a fade-in effect when loading new content or a smooth slide-in for modal windows.