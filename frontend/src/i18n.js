import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  en: {
    // Navigation & Header
    wallet: 'Wallet', home: 'Home', swap: 'Swap', profile: 'Profile',
    totalBalance: 'Total Balance', available: 'Available', portfolio: 'Portfolio', past24hr: 'Past 24hr',
    deposit: 'Deposit', send: 'Send', withdraw: 'Withdraw',
    // Assets
    assets: 'Assets', eurAsset: 'Euro', usdcAsset: 'USD Coin', locked: 'Locked (unpaid fees)', seeAll: 'See all', euroBalance: 'Euro Balance',
    connectedApps: 'Connected Apps', connectedVia: 'Connected via', connected: 'Connected',
    account: 'Account', ethAddress: 'ETH Address', kycStatus: 'KYC Status',
    // Deposit
    depositTitle: 'Deposit USDC (ERC-20)', depositDesc: 'Send USDC to this address on the Ethereum network.', walletAddress: 'Wallet Address', yourWalletAddress: 'Your wallet address:', copied: 'Copied!', copyAddress: 'Copy Address', networkWarning: 'Only send USDC on the Ethereum (ERC-20) network. Sending other tokens or using a different network may result in permanent loss.',
    // Send
    sendTitle: 'Send USDC', sendDesc: 'Wallet-to-wallet transfer (USDC only). Only funds from fee-paid transactions are available to send.', totalBalanceLabel: 'Total Balance', availableToSend: 'Available to Send', lockedUnpaidFees: 'Locked (unpaid fees)', recipientAddress: 'Recipient Address', destinationWalletAddress: 'Destination Wallet Address', recipientPlaceholder: '0x...', amount: 'Amount', amountUsdc: 'Amount (USDC)', max: 'Max', exceedsBalance: 'Amount exceeds available balance.', sendProcessingNote: 'Send transactions are processed within 2 minutes.', sending: 'Sending...', sendUsdc: 'Send USDC', noAvailableBalance: 'No available USDC balance.', txSubmitted: 'Transaction submitted! It will be confirmed in ~2 minutes.', sendFailed: 'Send failed',
    // Swap
    swapTitle: 'Swap', swapDesc: 'Convert between USDC and EUR instantly (0.2% commission)', from: 'From', to: 'To', youPay: 'You Pay', youReceive: 'You Receive', balance: 'Balance', rate: 'Rate', exchangeRate: 'Exchange Rate', commission: 'Commission (0.2%)', commissionLabel: 'Commission', swapSuccess: 'Swap Completed', swapping: 'Swapping...', swapNow: 'Swap Now', swapAnother: 'Swap Another', done: 'Done', insufficientBalance: 'Insufficient balance', youWillReceive: 'You will receive', swapFailed: 'Swap failed',
    // Withdraw
    withdrawTitle: 'Withdraw to Bank (IBAN)', withdrawDesc: 'Send EUR to your bank account via ECOMMBX', outstandingFees: 'Outstanding Fees', outstandingFeesMsg: 'in unpaid transaction fees. These must be cleared before any withdrawal can be processed.', youHave: 'You have', eurBalance: 'EUR Balance', status: 'Status', blocked: 'Blocked', feesExplanation: 'To withdraw EUR to your bank, all outstanding transaction fees must be paid first.', viewFees: 'View Fees', fixNow: 'Fix Now', fixNowSending: 'Sending...', connectedApp: 'Connected App', amountEur: 'Amount (EUR)', iban: 'IBAN', ibanPlaceholder: 'e.g. DE89 3704 0044 0532 0130 00', firstName: 'First Name', lastName: 'Last Name', withdrawNote: 'Withdrawal will be processed via your connected ECOMMBX app. Funds typically arrive within 1-3 business days.', withdrawing: 'Processing...', withdrawToBank: 'Withdraw to Bank', withdrawUnavailable: 'Withdrawal Unavailable', noEurBalance: 'No EUR balance to withdraw', exceedsEurBalance: 'Amount exceeds EUR balance', withdrawSuccess: 'Withdrawal submitted! Funds will arrive within 1-3 business days.', withdrawFailed: 'Withdrawal failed',
    // Fix Now
    emailSentTitle: 'Email Sent Successfully', emailSentMsg: 'We have sent a detailed email with instructions on how to resolve your outstanding fees.', emailSentCheck: 'Please check your inbox (and spam folder) for an email from Blockchain.com.', gotIt: 'Got it', failedSendEmail: 'Failed to send email',
    // Alerts
    passwordResetRequired: 'Password Reset Required', passwordResetDesc: 'Your identity has been verified! Please reset your password to secure your account.', checkEmailForReset: "Check your email for the password reset link.", resendPasswordResetEmail: 'Resend Password Reset Email', sendingDots: 'Sending...',
    kycPendingTitle: 'Identity Verification Pending', kycPendingDesc: 'Your documents are being reviewed. This usually takes 1-2 business days.',
    unusualActivityTitle: 'Unusual Activity Detected', unusualActivityDesc: 'We have detected unusual activity on your account. Please verify your identity.',
    accountInactiveTitle: 'Account Inactive', accountInactiveDesc: 'Your account has been frozen due to inactivity. Please follow the steps to reactivate.',
    fixAccountBtn: 'Click here to fix your account', emailSentSuccess: 'Email Sent Successfully!', emailSentAutoMsg: 'We have sent an automated email with the steps to unlock your account to:', checkInboxFreeze: 'Please check your inbox and follow the instructions to reactivate your account.', importantDeposit: 'You will need to deposit 100 EUR in USDC to reactivate. This is NOT a fee.', important: 'Important:', yourWalletAddressLabel: 'Your Wallet Address:', checkInboxKyc: 'Please check your inbox and follow the steps to verify your identity.', importantKyc: 'You must complete verification via the email link before accessing your account.', alreadyReceivedEmail: 'Already received the email?', completeKycVerification: 'Complete KYC Verification', passwordResetSent: 'Password reset email sent!', failedSendEmailGeneric: 'Failed to send email. Please try again.', walletRefreshed: 'Wallet refreshed', failedRefresh: 'Failed to refresh', copiedToClipboard: 'Copied to clipboard', signOut: 'Sign Out',
    // Notifications
    notifications: 'Notifications', noNotifications: 'No notifications', markAllRead: 'Mark all read',
    // Profile
    profileTitle: 'Profile', identityVerification: 'Identity Verification', verified: 'Verified', pendingReview: 'Pending Review', underReview: 'Under Review', rejected: 'Rejected', notVerified: 'Not Verified', verifyNow: 'Verify Now', personalInfo: 'Personal Information', email: 'Email', phoneNumber: 'Phone Number', notProvided: 'Not provided', dateOfBirth: 'Date of Birth', username: 'Username', walletAndSecurity: 'Wallet & Security', ethWalletAddress: 'ETH Wallet Address', notAssigned: 'Not assigned', accountStatus: 'Account Status', active: 'Active', frozen: 'Frozen', memberSince: 'Member Since', changePassword: 'Change Password', currentPassword: 'Current Password', newPassword: 'New Password', confirmNewPassword: 'Confirm New Password', enterCurrentPassword: 'Enter current password', enterNewPassword: 'Enter new password (min 8 characters)', confirmNewPasswordPlaceholder: 'Confirm new password', passwordsNoMatch: 'Passwords do not match', changingPassword: 'Changing...', passwordChanged: 'Password changed successfully', passwordMinLength: 'Password must be at least 8 characters', failedChangePassword: 'Failed to change password', unverified: 'Unverified',
    // Transactions
    transactionHistory: 'Transaction History', transactions: 'Transactions', all: 'All', deposits: 'Deposits', withdrawals: 'Withdrawals', receives: 'Receives', sends: 'Sends', swaps: 'Swaps', noTransactions: 'No transactions found', fee: 'Fee', paid: 'Paid', unpaid: 'Unpaid', unpaidFee: 'Unpaid Fee', completed: 'Completed', processing: 'Processing', pending: 'Pending', failed: 'Failed', previous: 'Previous', next: 'Next', pageOf: 'Page {page} of {total}',
    // Transaction type labels (for display)
    txDeposit: 'Deposit', txReceive: 'Receive', txSend: 'Send', txSwap: 'Swap', txWithdrawal: 'Withdrawal', txFee: 'Fee', txAdjustment: 'Adjustment',
    // Login
    loginTitle: 'Log In to Blockchain.com', loginEmail: 'Email', loginPassword: 'Password', loginButton: 'Log In', loggingIn: 'Logging in...', dontHaveAccount: "Don't have an account?", signUp: 'Sign Up', invalidCredentials: 'Invalid credentials',
    // Register
    registerTitle: 'Create your wallet', registerSubtitle: 'Join millions of users on Blockchain.com', registerButton: 'Create Wallet', creatingAccount: 'Creating account...', alreadyHaveAccount: 'Already have an account?', logIn: 'Log In', signIn: 'Sign in', passwordsMustMatch: 'Passwords do not match', passwordMin8: 'Password must be at least 8 characters', accountCreated: 'Account created successfully!', registrationFailed: 'Registration failed', registrationFailedRetry: 'Registration failed. Please try again.', termsAgreement: 'By creating an account, you agree to our Terms of Service and Privacy Policy.', confirmPassword: 'Confirm Password', atLeast8Chars: 'At least 8 characters', confirmYourPassword: 'Confirm your password', password: 'Password',
    // KYC
    kycTitle: 'Identity Verification', kycDesc: 'Please upload the required documents to verify your identity.', documentType: 'Document Type', selectDocType: 'Select Document Type', selectDocTypeDesc: "Choose the type of ID document you'll upload", passport: 'Passport', internationalPassport: 'International passport', idCard: 'ID Card', nationalIdCard: 'National ID card (front & back)', driverLicense: "Driver's License", idFront: 'ID Document (Front)', passportPhotoPage: 'Passport Photo Page', idCardFront: 'ID Card (Front)', idCardBack: 'ID Card (Back)', selfieWithId: 'Selfie with ID', selfieWithIdDesc: 'Take a photo of yourself holding your ID document', proofOfAddress: 'Proof of Address', proofOfAddressDesc: 'Utility bill or bank statement (less than 3 months old)', uploadFile: 'Upload file', clickToUpload: 'Click to upload', uploadSelfieWithId: 'Upload selfie with ID', uploadProofOfAddress: 'Upload proof of address', change: 'Change', submitting: 'Submitting...', submitForReview: 'Submit for Review', submitKyc: 'Submit Verification', continue: 'Continue', uploadDocuments: 'Upload Documents', uploadDocumentsDesc: 'Upload clear photos of your documents', finalStep: 'Final Step', finalStepDesc: 'Upload selfie and proof of address', fileSizeError: 'File size must be less than 5MB', fileTypeError: 'Please upload an image file', uploadIdFront: 'Please upload your ID document (front)', uploadIdBack: 'Please upload your ID document (back)', uploadSelfie: 'Please upload a selfie with your ID', uploadAddress: 'Please upload proof of address', kycSubmitted: 'KYC documents submitted successfully!', kycSubmitFailed: 'Failed to submit KYC documents', verificationComplete: 'Verification Complete', verificationCompleteDesc: 'Your identity has been verified successfully.', backToWallet: 'Back to Wallet', verificationPending: 'Verification Pending', verificationPendingDesc: 'Your documents are being reviewed. This usually takes 1-2 business days.', verifyingAccess: 'Verifying your access...', pleaseWaitAuth: 'Please wait while we authenticate you.', welcomeKyc: 'Welcome! Please complete your identity verification.', invalidKycLink: 'Invalid or expired verification link.', helloUser: 'Hello {name}! Please complete identity verification below.',
    // Landing Page
    landNav_features: 'Features', landNav_security: 'Security', landNav_about: 'About', landNav_login: 'Log In', landNav_signup: 'Sign Up', landNav_install: 'Install App',
    landHero_title1: "The World's Most", landHero_title2: ' Trusted', landHero_title3: ' Crypto Wallet',
    landHero_desc: 'Join over 90 million wallets created. Buy, sell, and manage your cryptocurrency portfolio with the most trusted name in crypto since 2011.',
    landHero_create: 'Create Wallet', landHero_access: 'Access Wallet',
    landHero_fca: 'FCA Registered', landHero_security: 'Bank-level Security',
    landHero_portfolioValue: 'Portfolio Value',
    landStats_wallets: 'Wallets Created', landStats_transactions: 'Transactions Processed', landStats_countries: 'Countries Supported', landStats_founded: 'Founded',
    landFeat_title: 'Everything you need in one wallet', landFeat_desc: 'Industry-leading security, instant transactions, and full control over your crypto assets.',
    landFeat1_title: 'Bank-Level Security', landFeat1_desc: 'Your assets are protected with industry-leading encryption and multi-signature technology.',
    landFeat2_title: 'Real-Time Trading', landFeat2_desc: 'Buy, sell, and swap cryptocurrencies instantly with competitive rates and low fees.',
    landFeat3_title: 'Mobile & Web Access', landFeat3_desc: 'Access your wallet anywhere, anytime. Available on all devices with seamless sync.',
    landFeat4_title: 'Global Coverage', landFeat4_desc: 'Send and receive crypto anywhere in the world. No borders, no limits.',
    landFeat5_title: 'Full Control', landFeat5_desc: 'You own your keys. Non-custodial wallet options available for complete sovereignty.',
    landFeat6_title: '24/7 Support', landFeat6_desc: 'Our dedicated support team is always ready to help you with any questions.',
    landSec_title: 'Security you can trust', landSec_desc: 'We take security seriously. Your assets are protected by the same technology trusted by major financial institutions worldwide.',
    landSec_aes: '256-bit AES encryption for all data', landSec_2fa: 'Two-factor authentication (2FA)', landSec_cold: 'Cold storage for majority of assets', landSec_audit: 'Regular third-party security audits', landSec_fca: 'FCA registered and regulated',
    landSec_title2: 'Your Security Matters', landSec_desc2: "We've never been hacked. Your funds are protected by industry-leading security measures.",
    landSec_breaches: 'Security Breaches', landSec_uptime: 'Uptime SLA',
    landAbout_title: 'About Blockchain.com', landAbout_desc: 'Founded in 2011, Blockchain.com is one of the oldest and most trusted cryptocurrency companies in the world.',
    landAbout_overview: 'Company Overview', landAbout_founded: 'Founded', landAbout_founders: 'Founders', landAbout_ceo: 'CEO', landAbout_hq: 'Headquarters', landAbout_industry: 'Industry', landAbout_employees: 'Employees',
    landAbout_hqVal: 'London, United Kingdom', landAbout_industryVal: 'Cryptocurrency Financial Services',
    landAbout_services: 'Our Services',
    landAbout_svc1_title: 'Crypto Wallet', landAbout_svc1_desc: 'Digital wallets for Bitcoin, Ethereum, USDC and more',
    landAbout_svc2_title: 'Exchange Platform', landAbout_svc2_desc: 'Buy, sell, and trade cryptocurrencies',
    landAbout_svc3_title: 'Blockchain Explorer', landAbout_svc3_desc: 'Public blockchain data viewer',
    landAbout_svc4_title: 'Institutional Services', landAbout_svc4_desc: 'OTC trading and institutional infrastructure',
    landAbout_regulation: 'Regulation:', landAbout_regDesc: 'Blockchain.com is registered with the UK Financial Conduct Authority (FCA) for crypto asset activities.',
    landCTA_title: 'Ready to start your crypto journey?', landCTA_desc: 'Join millions of users who trust Blockchain.com with their cryptocurrency.', landCTA_btn: 'Create Free Wallet',
    landFooter_products: 'Products', landFooter_wallet: 'Wallet', landFooter_exchange: 'Exchange', landFooter_explorer: 'Explorer', landFooter_institutional: 'Institutional',
    landFooter_company: 'Company', landFooter_about: 'About', landFooter_careers: 'Careers', landFooter_press: 'Press', landFooter_blog: 'Blog',
    landFooter_support: 'Support', landFooter_help: 'Help Center', landFooter_contact: 'Contact Us', landFooter_api: 'API Documentation', landFooter_status: 'Status',
    landFooter_legal: 'Legal', landFooter_privacy: 'Privacy Policy', landFooter_terms: 'Terms of Service', landFooter_cookies: 'Cookie Policy', landFooter_compliance: 'Compliance',
    landFooter_rights: 'All rights reserved.', landFooter_fca: 'Registered with the UK Financial Conduct Authority (FCA)',
    // General
    // General
    cancel: 'Cancel', save: 'Save', close: 'Close', loading: 'Loading...', error: 'Error', success: 'Success', refresh: 'Refresh', back: 'Back', backToHome: 'Back to Home', backToAdmin: 'Back to Admin Panel', language: 'Language',
    adminPreviewMode: 'Admin Preview Mode',
    swapNotAvailable: 'Swap not available', sendNotAvailable: 'Send not available',
    // Reset Password Page
    resetPasswordTitle: 'Reset Password', resetPasswordDesc: 'Create a new password for your account', resetPasswordComplete: 'Password Reset Complete', resetPasswordCompleteDesc: 'Your password has been successfully reset.', resetPasswordBtn: 'Reset Password', resettingPassword: 'Resetting...', invalidResetLink: 'Invalid reset link', passwordResetSuccess: 'Password reset successfully', failedResetPassword: 'Failed to reset password',
  },
  it: {
    wallet: 'Portafoglio', home: 'Home', swap: 'Scambia', profile: 'Profilo',
    totalBalance: 'Saldo Totale', available: 'Disponibile', portfolio: 'Portafoglio', past24hr: 'Ultime 24h',
    deposit: 'Deposita', send: 'Invia', withdraw: 'Preleva',
    assets: 'Asset', eurAsset: 'Euro', usdcAsset: 'USD Coin', locked: 'Bloccato (commissioni non pagate)', seeAll: 'Vedi tutto', euroBalance: 'Saldo Euro',
    connectedApps: 'App Collegate', connectedVia: 'Collegato tramite', connected: 'Collegato',
    account: 'Account', ethAddress: 'Indirizzo ETH', kycStatus: 'Stato KYC',
    depositTitle: 'Deposita USDC (ERC-20)', depositDesc: 'Invia USDC a questo indirizzo sulla rete Ethereum.', walletAddress: 'Indirizzo Portafoglio', yourWalletAddress: 'Il tuo indirizzo portafoglio:', copied: 'Copiato!', copyAddress: 'Copia Indirizzo', networkWarning: "Invia solo USDC sulla rete Ethereum (ERC-20). L'invio di altri token o l'utilizzo di una rete diversa potrebbe causare la perdita permanente dei fondi.",
    sendTitle: 'Invia USDC', sendDesc: "Trasferimento portafoglio a portafoglio (solo USDC). Solo i fondi da transazioni con commissioni pagate sono disponibili.", totalBalanceLabel: 'Saldo Totale', availableToSend: 'Disponibile per Invio', lockedUnpaidFees: 'Bloccato (commissioni non pagate)', recipientAddress: 'Indirizzo Destinatario', destinationWalletAddress: 'Indirizzo Portafoglio Destinatario', recipientPlaceholder: '0x...', amount: 'Importo', amountUsdc: 'Importo (USDC)', max: 'Max', exceedsBalance: 'Importo superiore al saldo disponibile.', sendProcessingNote: 'Le transazioni vengono elaborate entro 2 minuti.', sending: 'Invio in corso...', sendUsdc: 'Invia USDC', noAvailableBalance: 'Nessun saldo USDC disponibile.', txSubmitted: 'Transazione inviata! Sarà confermata in ~2 minuti.', sendFailed: 'Invio fallito',
    swapTitle: 'Scambia', swapDesc: 'Converti tra USDC ed EUR istantaneamente (commissione 0,2%)', from: 'Da', to: 'A', youPay: 'Paghi', youReceive: 'Ricevi', balance: 'Saldo', rate: 'Tasso', exchangeRate: 'Tasso di Cambio', commission: 'Commissione (0,2%)', commissionLabel: 'Commissione', swapSuccess: 'Scambio Riuscito', swapping: 'Scambio in corso...', swapNow: 'Scambia Ora', swapAnother: 'Nuovo Scambio', done: 'Fatto', insufficientBalance: 'Saldo insufficiente', youWillReceive: 'Riceverai', swapFailed: 'Scambio fallito',
    withdrawTitle: 'Preleva su Conto Bancario (IBAN)', withdrawDesc: 'Invia EUR al tuo conto bancario tramite ECOMMBX', outstandingFees: 'Commissioni in Sospeso', outstandingFeesMsg: 'in commissioni non pagate. Queste devono essere saldate prima di qualsiasi prelievo.', youHave: 'Hai', eurBalance: 'Saldo EUR', status: 'Stato', blocked: 'Bloccato', feesExplanation: "Per prelevare EUR, tutte le commissioni in sospeso devono prima essere pagate.", viewFees: 'Vedi Commissioni', fixNow: 'Risolvi Ora', fixNowSending: 'Invio in corso...', connectedApp: 'App Collegata', amountEur: 'Importo (EUR)', iban: 'IBAN', ibanPlaceholder: 'es. IT60 X054 2811 1010 0000 0123 456', firstName: 'Nome', lastName: 'Cognome', withdrawNote: "Il prelievo verrà elaborato tramite ECOMMBX. I fondi arriveranno entro 1-3 giorni lavorativi.", withdrawing: 'Elaborazione...', withdrawToBank: 'Preleva su Conto', withdrawUnavailable: 'Prelievo Non Disponibile', noEurBalance: 'Nessun saldo EUR da prelevare', exceedsEurBalance: "L'importo supera il saldo EUR", withdrawSuccess: 'Prelievo inviato! I fondi arriveranno entro 1-3 giorni lavorativi.', withdrawFailed: 'Prelievo fallito',
    emailSentTitle: 'Email Inviata con Successo', emailSentMsg: "Ti abbiamo inviato un'email con le istruzioni per risolvere le commissioni in sospeso.", emailSentCheck: "Controlla la tua casella di posta (e spam) per un'email da Blockchain.com.", gotIt: 'Ho capito', failedSendEmail: "Impossibile inviare l'email",
    passwordResetRequired: 'Reimpostazione Password Richiesta', passwordResetDesc: "La tua identità è stata verificata! Reimposta la password per proteggere il tuo account.", checkEmailForReset: 'Controlla la tua email per il link di reimpostazione.', resendPasswordResetEmail: 'Rinvia Email di Reimpostazione', sendingDots: 'Invio in corso...',
    kycPendingTitle: 'Verifica Identità in Corso', kycPendingDesc: 'I tuoi documenti sono in fase di revisione. Di solito 1-2 giorni lavorativi.',
    unusualActivityTitle: 'Attività Insolita Rilevata', unusualActivityDesc: 'Abbiamo rilevato attività insolite. Verifica la tua identità per continuare.',
    accountInactiveTitle: 'Account Inattivo', accountInactiveDesc: 'Il tuo account è stato congelato per inattività. Segui i passaggi per riattivarlo.',
    fixAccountBtn: 'Clicca qui per risolvere', emailSentSuccess: 'Email Inviata con Successo!', emailSentAutoMsg: "Abbiamo inviato un'email con i passaggi per sbloccare il tuo account a:", checkInboxFreeze: 'Controlla la tua casella di posta e segui le istruzioni per riattivare.', importantDeposit: 'Dovrai depositare 100 EUR in USDC per riattivare. NON è una commissione.', important: 'Importante:', yourWalletAddressLabel: 'Il Tuo Indirizzo Portafoglio:', checkInboxKyc: 'Controlla la tua casella di posta e segui i passaggi per verificare la tua identità.', importantKyc: "Devi completare la verifica tramite il link nell'email.", alreadyReceivedEmail: "Hai già ricevuto l'email?", completeKycVerification: 'Completa la Verifica KYC', passwordResetSent: 'Email di reimpostazione inviata!', failedSendEmailGeneric: "Impossibile inviare l'email. Riprova.", walletRefreshed: 'Portafoglio aggiornato', failedRefresh: 'Aggiornamento fallito', copiedToClipboard: 'Copiato negli appunti', signOut: 'Esci',
    notifications: 'Notifiche', noNotifications: 'Nessuna notifica', markAllRead: 'Segna tutto come letto',
    profileTitle: 'Profilo', identityVerification: 'Verifica Identità', verified: 'Verificato', pendingReview: 'In Attesa di Revisione', underReview: 'In Revisione', rejected: 'Rifiutato', notVerified: 'Non Verificato', verifyNow: 'Verifica Ora', personalInfo: 'Informazioni Personali', email: 'Email', phoneNumber: 'Numero di Telefono', notProvided: 'Non fornito', dateOfBirth: 'Data di Nascita', username: 'Nome Utente', walletAndSecurity: 'Portafoglio e Sicurezza', ethWalletAddress: 'Indirizzo Portafoglio ETH', notAssigned: 'Non assegnato', accountStatus: 'Stato Account', active: 'Attivo', frozen: 'Congelato', memberSince: 'Membro Dal', changePassword: 'Cambia Password', currentPassword: 'Password Attuale', newPassword: 'Nuova Password', confirmNewPassword: 'Conferma Nuova Password', enterCurrentPassword: 'Inserisci la password attuale', enterNewPassword: 'Inserisci nuova password (min 8 caratteri)', confirmNewPasswordPlaceholder: 'Conferma nuova password', passwordsNoMatch: 'Le password non corrispondono', changingPassword: 'Modifica in corso...', passwordChanged: 'Password modificata con successo', passwordMinLength: 'La password deve contenere almeno 8 caratteri', failedChangePassword: 'Modifica password fallita', unverified: 'Non verificato',
    transactionHistory: 'Storico Transazioni', transactions: 'Transazioni', all: 'Tutte', deposits: 'Depositi', withdrawals: 'Prelievi', receives: 'Ricevute', sends: 'Invii', swaps: 'Scambi', noTransactions: 'Nessuna transazione trovata', fee: 'Commissione', paid: 'Pagata', unpaid: 'Non pagata', unpaidFee: 'Commissione Non Pagata', completed: 'Completata', processing: 'In elaborazione', pending: 'In attesa', failed: 'Fallita', previous: 'Precedente', next: 'Successivo', pageOf: 'Pagina {page} di {total}',
    txDeposit: 'Deposito', txReceive: 'Ricezione', txSend: 'Invio', txSwap: 'Scambio', txWithdrawal: 'Prelievo', txFee: 'Commissione', txAdjustment: 'Rettifica',
    loginTitle: 'Accedi a Blockchain.com', loginEmail: 'Email', loginPassword: 'Password', loginButton: 'Accedi', loggingIn: 'Accesso in corso...', dontHaveAccount: 'Non hai un account?', signUp: 'Registrati', invalidCredentials: 'Credenziali non valide',
    registerTitle: 'Crea il tuo portafoglio', registerSubtitle: 'Unisciti a milioni di utenti su Blockchain.com', registerButton: 'Crea Portafoglio', creatingAccount: 'Creazione in corso...', alreadyHaveAccount: 'Hai già un account?', logIn: 'Accedi', signIn: 'Accedi', passwordsMustMatch: 'Le password non corrispondono', passwordMin8: 'La password deve contenere almeno 8 caratteri', accountCreated: 'Account creato con successo!', registrationFailed: 'Registrazione fallita', registrationFailedRetry: 'Registrazione fallita. Riprova.', termsAgreement: 'Creando un account, accetti i nostri Termini di Servizio e la Politica sulla Privacy.', confirmPassword: 'Conferma Password', atLeast8Chars: 'Almeno 8 caratteri', confirmYourPassword: 'Conferma la tua password', password: 'Password',
    kycTitle: 'Verifica Identità', kycDesc: 'Carica i documenti richiesti per verificare la tua identità.', documentType: 'Tipo di Documento', selectDocType: 'Seleziona Tipo di Documento', selectDocTypeDesc: 'Scegli il tipo di documento che caricherai', passport: 'Passaporto', internationalPassport: 'Passaporto internazionale', idCard: "Carta d'Identità", nationalIdCard: "Carta d'identità nazionale (fronte e retro)", driverLicense: 'Patente di Guida', idFront: 'Documento (Fronte)', passportPhotoPage: 'Pagina Foto Passaporto', idCardFront: "Carta d'Identità (Fronte)", idCardBack: "Carta d'Identità (Retro)", selfieWithId: 'Selfie con Documento', selfieWithIdDesc: 'Scatta una foto con il tuo documento', proofOfAddress: 'Prova di Residenza', proofOfAddressDesc: 'Bolletta o estratto conto (meno di 3 mesi)', uploadFile: 'Carica file', clickToUpload: 'Clicca per caricare', uploadSelfieWithId: 'Carica selfie con documento', uploadProofOfAddress: 'Carica prova di residenza', change: 'Cambia', submitting: 'Invio in corso...', submitForReview: 'Invia per Revisione', submitKyc: 'Invia Verifica', continue: 'Continua', uploadDocuments: 'Carica Documenti', uploadDocumentsDesc: 'Carica foto chiare dei tuoi documenti', finalStep: 'Ultimo Passaggio', finalStepDesc: 'Carica selfie e prova di residenza', fileSizeError: 'Il file deve essere inferiore a 5MB', fileTypeError: 'Carica un file immagine', uploadIdFront: 'Carica il documento (fronte)', uploadIdBack: 'Carica il documento (retro)', uploadSelfie: 'Carica un selfie con il documento', uploadAddress: 'Carica la prova di residenza', kycSubmitted: 'Documenti KYC inviati con successo!', kycSubmitFailed: 'Invio documenti fallito', verificationComplete: 'Verifica Completata', verificationCompleteDesc: 'La tua identità è stata verificata con successo.', backToWallet: 'Torna al Portafoglio', verificationPending: 'Verifica in Corso', verificationPendingDesc: 'I tuoi documenti sono in revisione. Di solito 1-2 giorni lavorativi.', verifyingAccess: 'Verifica accesso in corso...', pleaseWaitAuth: "Attendere l'autenticazione.", welcomeKyc: 'Benvenuto! Completa la verifica della tua identità.', invalidKycLink: 'Link di verifica non valido o scaduto.', helloUser: "Ciao {name}! Completa la verifica dell'identità qui sotto.",
    // Landing Page
    landNav_features: 'Funzionalità', landNav_security: 'Sicurezza', landNav_about: 'Chi siamo', landNav_login: 'Accedi', landNav_signup: 'Registrati', landNav_install: 'Installa App',
    landHero_title1: 'Il Crypto Wallet Più', landHero_title2: ' Affidabile', landHero_title3: ' al Mondo',
    landHero_desc: 'Unisciti a oltre 90 milioni di portafogli creati. Acquista, vendi e gestisci il tuo portafoglio di criptovalute con il nome più affidabile nel mondo crypto dal 2011.',
    landHero_create: 'Crea Portafoglio', landHero_access: 'Accedi al Portafoglio',
    landHero_fca: 'Registrato FCA', landHero_security: 'Sicurezza Bancaria',
    landHero_portfolioValue: 'Valore Portafoglio',
    landStats_wallets: 'Portafogli Creati', landStats_transactions: 'Transazioni Elaborate', landStats_countries: 'Paesi Supportati', landStats_founded: 'Fondazione',
    landFeat_title: 'Tutto ciò di cui hai bisogno in un portafoglio', landFeat_desc: 'Sicurezza leader del settore, transazioni istantanee e pieno controllo sui tuoi asset crypto.',
    landFeat1_title: 'Sicurezza Bancaria', landFeat1_desc: 'I tuoi asset sono protetti con crittografia leader del settore e tecnologia multi-firma.',
    landFeat2_title: 'Trading in Tempo Reale', landFeat2_desc: 'Acquista, vendi e scambia criptovalute istantaneamente con tariffe competitive.',
    landFeat3_title: 'Accesso Mobile e Web', landFeat3_desc: 'Accedi al tuo portafoglio ovunque, in qualsiasi momento. Disponibile su tutti i dispositivi.',
    landFeat4_title: 'Copertura Globale', landFeat4_desc: 'Invia e ricevi crypto in tutto il mondo. Senza confini, senza limiti.',
    landFeat5_title: 'Controllo Totale', landFeat5_desc: 'Le tue chiavi sono tue. Opzioni di portafoglio non-custodial disponibili.',
    landFeat6_title: 'Supporto 24/7', landFeat6_desc: 'Il nostro team di supporto dedicato è sempre pronto ad aiutarti.',
    landSec_title: 'Sicurezza di cui ti puoi fidare', landSec_desc: 'Prendiamo la sicurezza sul serio. I tuoi asset sono protetti dalla stessa tecnologia utilizzata dalle maggiori istituzioni finanziarie.',
    landSec_aes: 'Crittografia AES a 256 bit per tutti i dati', landSec_2fa: 'Autenticazione a due fattori (2FA)', landSec_cold: 'Cold storage per la maggior parte degli asset', landSec_audit: 'Audit di sicurezza periodici di terze parti', landSec_fca: 'Registrato e regolamentato FCA',
    landSec_title2: 'La Tua Sicurezza Conta', landSec_desc2: 'Non siamo mai stati violati. I tuoi fondi sono protetti da misure di sicurezza leader del settore.',
    landSec_breaches: 'Violazioni di Sicurezza', landSec_uptime: 'SLA Uptime',
    landAbout_title: 'Chi è Blockchain.com', landAbout_desc: 'Fondata nel 2011, Blockchain.com è una delle più antiche e affidabili aziende di criptovalute al mondo.',
    landAbout_overview: 'Panoramica Aziendale', landAbout_founded: 'Fondazione', landAbout_founders: 'Fondatori', landAbout_ceo: 'CEO', landAbout_hq: 'Sede Centrale', landAbout_industry: 'Settore', landAbout_employees: 'Dipendenti',
    landAbout_hqVal: 'Londra, Regno Unito', landAbout_industryVal: 'Servizi Finanziari Crypto',
    landAbout_services: 'I Nostri Servizi',
    landAbout_svc1_title: 'Crypto Wallet', landAbout_svc1_desc: 'Portafogli digitali per Bitcoin, Ethereum, USDC e altro',
    landAbout_svc2_title: 'Piattaforma Exchange', landAbout_svc2_desc: 'Acquista, vendi e scambia criptovalute',
    landAbout_svc3_title: 'Blockchain Explorer', landAbout_svc3_desc: 'Visualizzatore dati blockchain pubblici',
    landAbout_svc4_title: 'Servizi Istituzionali', landAbout_svc4_desc: 'Trading OTC e infrastruttura istituzionale',
    landAbout_regulation: 'Regolamentazione:', landAbout_regDesc: 'Blockchain.com è registrata presso la Financial Conduct Authority (FCA) del Regno Unito per attività su cripto-asset.',
    landCTA_title: 'Pronto per iniziare il tuo viaggio crypto?', landCTA_desc: 'Unisciti a milioni di utenti che si fidano di Blockchain.com.', landCTA_btn: 'Crea Portafoglio Gratuito',
    landFooter_products: 'Prodotti', landFooter_wallet: 'Portafoglio', landFooter_exchange: 'Exchange', landFooter_explorer: 'Explorer', landFooter_institutional: 'Istituzionale',
    landFooter_company: 'Azienda', landFooter_about: 'Chi siamo', landFooter_careers: 'Lavora con noi', landFooter_press: 'Stampa', landFooter_blog: 'Blog',
    landFooter_support: 'Supporto', landFooter_help: 'Centro Assistenza', landFooter_contact: 'Contattaci', landFooter_api: 'Documentazione API', landFooter_status: 'Stato',
    landFooter_legal: 'Legale', landFooter_privacy: 'Politica sulla Privacy', landFooter_terms: 'Termini di Servizio', landFooter_cookies: 'Politica sui Cookie', landFooter_compliance: 'Conformità',
    landFooter_rights: 'Tutti i diritti riservati.', landFooter_fca: 'Registrato presso la Financial Conduct Authority (FCA) del Regno Unito',
    cancel: 'Annulla', save: 'Salva', close: 'Chiudi', loading: 'Caricamento...', error: 'Errore', success: 'Successo', refresh: 'Aggiorna', back: 'Indietro', backToHome: 'Torna alla Home', backToAdmin: 'Torna al Pannello Admin', language: 'Lingua',
    adminPreviewMode: 'Modalità Anteprima Admin',
    swapNotAvailable: 'Scambio non disponibile', sendNotAvailable: 'Invio non disponibile',
    resetPasswordTitle: 'Reimposta Password', resetPasswordDesc: 'Crea una nuova password per il tuo account', resetPasswordComplete: 'Password Reimpostata', resetPasswordCompleteDesc: 'La tua password è stata reimpostata con successo.', resetPasswordBtn: 'Reimposta Password', resettingPassword: 'Reimpostazione...', invalidResetLink: 'Link di reimpostazione non valido', passwordResetSuccess: 'Password reimpostata con successo', failedResetPassword: 'Reimpostazione password fallita',
  }
};

function detectLanguage() {
  const saved = localStorage.getItem('app_language');
  if (saved === 'it' || saved === 'en') return saved;
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';
  return browserLang.startsWith('it') ? 'it' : 'en';
}

const LangContext = createContext({ lang: 'en', t: translations.en, toggleLang: () => {} });

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(detectLanguage);
  const t = translations[lang] || translations.en;
  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'it' ? 'en' : 'it';
      localStorage.setItem('app_language', next);
      // Sync to backend if user is logged in
      const token = localStorage.getItem('token');
      if (token) {
        const API = process.env.REACT_APP_BACKEND_URL;
        fetch(`${API}/api/auth/language?lang=${next}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).catch(() => {});
      }
      return next;
    });
  }, []);
  return <LangContext.Provider value={{ lang, t, toggleLang }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);

// Helper: translate transaction type
export const txTypeLabel = (t, type) => {
  const map = { deposit: t.txDeposit, receive: t.txReceive, send: t.txSend, swap: t.txSwap, withdrawal: t.txWithdrawal, fee: t.txFee, adjustment: t.txAdjustment };
  return map[type] || type;
};

// Helper: date locale
export const dateFmt = (lang) => lang === 'it' ? 'it-IT' : 'en-US';

export function getTranslations() { return translations[detectLanguage()] || translations.en; }
export function getLang() { return detectLanguage(); }
export default translations;
