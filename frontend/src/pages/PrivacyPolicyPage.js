import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white" data-testid="privacy-policy-page">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-500 mb-8">Last updated: 1 January 2026</p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            Zenthos ("we", "our", "us") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our digital asset management platform and related services (collectively, the "Service"). Zenthos is a private limited company registered in England and Wales, with its registered office at 45 Queen Street, Deal, Kent, England, CT14 6EY.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
          <p className="text-gray-700 mb-3 leading-relaxed">We may collect and process the following categories of personal data:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
            <li><strong>Identity Data:</strong> First name, last name, date of birth, and government-issued identification documents submitted as part of our Know Your Customer (KYC) verification process.</li>
            <li><strong>Contact Data:</strong> Email address and, where provided, telephone number.</li>
            <li><strong>Account Data:</strong> Username, password (stored in encrypted form), account preferences, and transaction history.</li>
            <li><strong>Verification Data:</strong> Photographs of identity documents, proof of address, and video selfie recordings required for identity verification.</li>
            <li><strong>Technical Data:</strong> IP address, browser type and version, device information, time zone setting, operating system, and platform.</li>
            <li><strong>Usage Data:</strong> Information about how you use our Service, including pages visited, features accessed, and interaction patterns.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-700 mb-3 leading-relaxed">We use your personal data for the following purposes:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
            <li>To create and manage your account and provide access to the Service.</li>
            <li>To verify your identity in compliance with applicable anti-money laundering (AML) and know your customer (KYC) regulations.</li>
            <li>To process transactions and maintain accurate records.</li>
            <li>To communicate with you regarding your account, including service updates, security alerts, and support messages.</li>
            <li>To detect, prevent, and address fraud, security breaches, and technical issues.</li>
            <li>To comply with our legal and regulatory obligations.</li>
            <li>To improve and optimise the Service based on aggregated usage patterns.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Legal Basis for Processing</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            We process your personal data under the following legal bases as set out in the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018: (a) performance of a contract — to provide the Service to you; (b) compliance with a legal obligation — to meet our regulatory requirements; (c) legitimate interests — to improve our Service, ensure security, and prevent fraud; and (d) consent — where you have given explicit consent for specific processing activities.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
          <p className="text-gray-700 mb-3 leading-relaxed">We may share your personal data with:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
            <li><strong>Service Providers:</strong> Third-party companies that perform services on our behalf, such as cloud hosting, email delivery, and identity verification. These providers are contractually obligated to protect your data.</li>
            <li><strong>Regulatory Authorities:</strong> Where required by law, regulation, or legal process, we may disclose your information to relevant authorities.</li>
            <li><strong>Professional Advisors:</strong> Including lawyers, auditors, and insurers where necessary for the purposes of managing risks and legal claims.</li>
          </ul>
          <p className="text-gray-700 mb-6 leading-relaxed">We do not sell your personal data to third parties.</p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            We retain your personal data only for as long as is necessary to fulfil the purposes for which it was collected, including to satisfy any legal, regulatory, accounting, or reporting requirements. KYC documentation is retained in accordance with applicable anti-money laundering regulations. When your data is no longer required, it will be securely deleted or anonymised.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Security</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These measures include encryption of data in transit and at rest, access controls, regular security assessments, and secure data storage practices.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Rights</h2>
          <p className="text-gray-700 mb-3 leading-relaxed">Under applicable data protection legislation, you have the right to:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
            <li>Request access to the personal data we hold about you.</li>
            <li>Request correction of inaccurate or incomplete personal data.</li>
            <li>Request erasure of your personal data in certain circumstances.</li>
            <li>Object to or request restriction of processing of your personal data.</li>
            <li>Request the transfer of your personal data to another service provider (data portability).</li>
            <li>Withdraw consent at any time where processing is based on consent.</li>
          </ul>
          <p className="text-gray-700 mb-6 leading-relaxed">
            To exercise any of these rights, please contact us at <a href="mailto:support@x-zenthos.com" className="text-blue-600 hover:underline">support@x-zenthos.com</a>.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            Our Service uses essential cookies to ensure the proper functioning of the platform, including session management and authentication. We do not use third-party tracking or advertising cookies. By using the Service, you consent to the use of essential cookies.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the updated policy on this page with a revised "Last updated" date. We encourage you to review this page periodically.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            If you have any questions about this Privacy Policy or our data practices, please contact us at:
          </p>
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-gray-800 font-medium">Zenthos</p>
            <p className="text-gray-600">45 Queen Street, Deal, Kent, England, CT14 6EY</p>
            <p className="text-gray-600">Email: <a href="mailto:support@x-zenthos.com" className="text-blue-600 hover:underline">support@x-zenthos.com</a></p>
          </div>

          <p className="text-gray-700 mb-6 leading-relaxed">
            You also have the right to lodge a complaint with the Information Commissioner's Office (ICO), the UK supervisory authority for data protection, at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ico.org.uk</a>.
          </p>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Zenthos. All rights reserved.</p>
          <div className="flex space-x-6 mt-2 sm:mt-0">
            <Link to="/terms" className="hover:text-gray-900">Terms of Service</Link>
            <Link to="/about" className="hover:text-gray-900">About Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
