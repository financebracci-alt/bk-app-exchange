import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Globe, Users, Lock, Mail, MapPin, Building } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white" data-testid="about-page">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center">
          <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">About Zenthos</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero section */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-3xl">Z</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Trusted Digital Asset Management
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Zenthos provides a secure, reliable platform for managing digital assets. Founded in 2017 and headquartered in the United Kingdom, we are committed to delivering institutional-grade security and a seamless user experience for individuals and businesses alike.
          </p>
        </div>

        {/* Mission */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            At Zenthos, our mission is to make digital asset management accessible, transparent, and secure. We believe that financial tools should empower users with full control over their assets, backed by robust security measures and clear regulatory compliance.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We are dedicated to building a platform where trust is earned through transparency, where security is built into every layer, and where our users can manage their digital portfolios with confidence.
          </p>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">What Guides Us</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <Shield className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Security First</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Every feature we build starts with security. From encrypted data storage to rigorous identity verification, safeguarding your assets and personal information is our highest priority.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <Lock className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Regulatory Compliance</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                We adhere to applicable anti-money laundering (AML) and know your customer (KYC) regulations, ensuring that our platform operates within the bounds of UK and international financial law.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <Users className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">User-Centred Design</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                We design our platform with real users in mind. From onboarding to daily use, every interaction is crafted for clarity, simplicity, and reliability across all devices.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <Globe className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Transparency</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                We believe in open communication with our users. Our fee structures, policies, and operational practices are clearly documented and readily available.
              </p>
            </div>
          </div>
        </div>

        {/* Company details */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Company Information</h3>
          <div className="bg-gray-50 rounded-xl p-8">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <Building className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Company Name</p>
                  <p className="text-gray-900">Zenthos</p>
                  <p className="text-sm text-gray-500">Private Limited Company</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Registered Office</p>
                  <p className="text-gray-900">45 Queen Street</p>
                  <p className="text-gray-600">Deal, Kent, England, CT14 6EY</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Contact</p>
                  <a href="mailto:support@eu-zenthos.com" className="text-blue-600 hover:underline">support@eu-zenthos.com</a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Incorporated</p>
                  <p className="text-gray-900">28 June 2017</p>
                  <p className="text-sm text-gray-500">England and Wales</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center bg-blue-50 rounded-xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Get in Touch</h3>
          <p className="text-gray-600 mb-4">
            Have questions or need support? Our team is here to help.
          </p>
          <a href="mailto:support@eu-zenthos.com" className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 transition-colors">
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </a>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-6 px-4 mt-16">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Zenthos. All rights reserved.</p>
          <div className="flex space-x-6 mt-2 sm:mt-0">
            <Link to="/privacy" className="hover:text-gray-900">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-900">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
