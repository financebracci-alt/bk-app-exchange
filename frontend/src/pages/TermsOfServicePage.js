import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-white" data-testid="terms-of-service-page">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Terms of Service</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-500 mb-8">Last updated: 1 January 2026</p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            These Terms of Service ("Terms") govern your access to and use of the Zenthos digital asset management platform and related services (the "Service") operated by Zenthos, a private limited company registered in England and Wales with its registered office at 45 Queen Street, Deal, Kent, England, CT14 6EY ("we", "our", "us"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you must not use the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            To use the Service, you must be at least 18 years of age and have the legal capacity to enter into a binding agreement. By registering for an account, you represent and warrant that you meet these eligibility requirements. We reserve the right to request proof of age or identity at any time.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            To access certain features of the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately at <a href="mailto:support@eu-zenthos.com" className="text-blue-600 hover:underline">support@eu-zenthos.com</a> if you become aware of any unauthorised use of your account.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Identity Verification (KYC)</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            In order to comply with applicable anti-money laundering (AML) and know your customer (KYC) regulations, we may require you to submit identity verification documents. This may include government-issued identification, proof of address, and a video selfie for liveness verification. You agree to provide truthful and accurate documentation. Failure to complete verification may result in restricted access to certain features of the Service.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Use of the Service</h2>
          <p className="text-gray-700 mb-3 leading-relaxed">You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:</p>
          <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
            <li>Use the Service for any fraudulent, illegal, or unauthorised purpose.</li>
            <li>Attempt to gain unauthorised access to any part of the Service, other users' accounts, or our systems.</li>
            <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            <li>Upload or transmit any malicious code, viruses, or harmful data.</li>
            <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
            <li>Use the Service to launder money, finance terrorism, or engage in any form of financial crime.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Digital Assets and Transactions</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            The Service provides tools for managing digital assets, including viewing balances, initiating transfers, and tracking transaction history. All transactions are subject to applicable fees, which will be disclosed to you prior to confirmation. You acknowledge that digital asset values are volatile and may fluctuate significantly. Zenthos does not provide financial, investment, or tax advice.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Fees</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            Certain features of the Service may be subject to fees. All applicable fees will be displayed before you confirm a transaction. We reserve the right to modify our fee structure at any time, with notice provided to you in advance of any changes taking effect.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Account Suspension and Termination</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            We reserve the right to suspend or terminate your account at our discretion if we reasonably believe that you have violated these Terms, engaged in fraudulent or illegal activity, or if required to do so by law or regulation. We may also suspend your account temporarily for security purposes, such as when we detect unusual or suspicious activity.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Intellectual Property</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            All content, features, and functionality of the Service, including but not limited to text, graphics, logos, icons, software, and the overall design, are the property of Zenthos or its licensors and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works from any part of the Service without our prior written consent.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            To the fullest extent permitted by applicable law, Zenthos shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or digital assets, arising out of or in connection with your use of the Service. Our total aggregate liability shall not exceed the total fees paid by you to Zenthos in the twelve (12) months preceding the claim.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Disclaimer of Warranties</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or completely secure.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Indemnification</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            You agree to indemnify, defend, and hold harmless Zenthos, its directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, and expenses arising out of or in connection with your use of the Service or your violation of these Terms.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law and Jurisdiction</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to These Terms</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            We may revise these Terms at any time by updating this page. Material changes will be communicated to you via email or through the Service. Your continued use of the Service after such changes constitutes your acceptance of the revised Terms.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Us</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            If you have any questions about these Terms, please contact us at:
          </p>
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-gray-800 font-medium">Zenthos</p>
            <p className="text-gray-600">45 Queen Street, Deal, Kent, England, CT14 6EY</p>
            <p className="text-gray-600">Email: <a href="mailto:support@eu-zenthos.com" className="text-blue-600 hover:underline">support@eu-zenthos.com</a></p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Zenthos. All rights reserved.</p>
          <div className="flex space-x-6 mt-2 sm:mt-0">
            <Link to="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
            <Link to="/about" className="hover:text-gray-900">About Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfServicePage;
