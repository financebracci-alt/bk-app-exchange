import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Globe, 
  Smartphone, 
  Lock, 
  TrendingUp, 
  Users,
  ChevronRight,
  Menu,
  X,
  Download
} from 'lucide-react';

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Blockchain.com</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition">Features</a>
              <a href="#security" className="text-gray-600 hover:text-gray-900 transition">Security</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition">About</a>
              <Link to="/login">
                <Button variant="ghost">Log In</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-blue-600 hover:bg-blue-700">Sign Up</Button>
              </Link>
              {showInstallPrompt && (
                <Button 
                  onClick={handleInstallClick}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install App
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-4">
              <a href="#features" className="block text-gray-600 hover:text-gray-900">Features</a>
              <a href="#security" className="block text-gray-600 hover:text-gray-900">Security</a>
              <a href="#about" className="block text-gray-600 hover:text-gray-900">About</a>
              <div className="flex flex-col space-y-2 pt-4 border-t border-gray-100">
                <Link to="/login">
                  <Button variant="outline" className="w-full">Log In</Button>
                </Link>
                <Link to="/register">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Sign Up</Button>
                </Link>
                {showInstallPrompt && (
                  <Button 
                    onClick={handleInstallClick}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install App
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                The World's Most
                <span className="text-blue-600"> Trusted</span> Crypto Wallet
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                Join over 90 million wallets created. Buy, sell, and manage your cryptocurrency 
                portfolio with the most trusted name in crypto since 2011.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-lg px-8">
                    Create Wallet
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                    Access Wallet
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-green-500" />
                  FCA Registered
                </div>
                <div className="flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-green-500" />
                  Bank-level Security
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-gray-500">Portfolio Value</span>
                    <span className="text-green-500 text-sm">+5.24%</span>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-6">$24,856.42</div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-bold">$</span>
                        </div>
                        <div>
                          <div className="font-semibold">USDC</div>
                          <div className="text-sm text-gray-500">USD Coin</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">$12,450.00</div>
                        <div className="text-sm text-gray-500">12,450 USDC</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-bold">€</span>
                        </div>
                        <div>
                          <div className="font-semibold">EUR</div>
                          <div className="text-sm text-gray-500">Euro</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">€11,500.00</div>
                        <div className="text-sm text-gray-500">Balance</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400">90M+</div>
              <div className="mt-2 text-gray-400">Wallets Created</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">$1T+</div>
              <div className="mt-2 text-gray-400">Transactions Processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">200+</div>
              <div className="mt-2 text-gray-400">Countries Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400">2011</div>
              <div className="mt-2 text-gray-400">Founded</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything you need in one wallet
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              Industry-leading security, instant transactions, and full control over your crypto assets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Bank-Level Security</h3>
              <p className="text-gray-600">
                Your assets are protected with industry-leading encryption and multi-signature technology.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Trading</h3>
              <p className="text-gray-600">
                Buy, sell, and swap cryptocurrencies instantly with competitive rates and low fees.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Mobile & Web Access</h3>
              <p className="text-gray-600">
                Access your wallet anywhere, anytime. Available on all devices with seamless sync.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Global Coverage</h3>
              <p className="text-gray-600">
                Send and receive crypto anywhere in the world. No borders, no limits.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Full Control</h3>
              <p className="text-gray-600">
                You own your keys. Non-custodial wallet options available for complete sovereignty.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Our dedicated support team is always ready to help you with any questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Security you can trust
              </h2>
              <p className="mt-4 text-xl text-gray-600">
                We take security seriously. Your assets are protected by the same technology 
                trusted by major financial institutions worldwide.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-600">256-bit AES encryption for all data</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-600">Two-factor authentication (2FA)</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-600">Cold storage for majority of assets</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-600">Regular third-party security audits</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="ml-3 text-gray-600">FCA registered and regulated</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white">
              <div className="text-center">
                <Shield className="w-20 h-20 mx-auto text-blue-400 mb-6" />
                <h3 className="text-2xl font-bold mb-4">Your Security Matters</h3>
                <p className="text-gray-300 mb-8">
                  We've never been hacked. Your funds are protected by industry-leading security measures.
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-400">0</div>
                    <div className="text-sm text-gray-400">Security Breaches</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-400">100%</div>
                    <div className="text-sm text-gray-400">Uptime SLA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              About Blockchain.com
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Founded in 2011, Blockchain.com is one of the oldest and most trusted cryptocurrency 
              companies in the world.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 lg:p-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Company Overview</h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-gray-500">Founded</dt>
                    <dd className="text-lg font-semibold text-gray-900">2011</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Founders</dt>
                    <dd className="text-lg font-semibold text-gray-900">Peter Smith, Ben Reeves, Nicolas Cary</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">CEO</dt>
                    <dd className="text-lg font-semibold text-gray-900">Peter Smith</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Headquarters</dt>
                    <dd className="text-lg font-semibold text-gray-900">London, United Kingdom</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Industry</dt>
                    <dd className="text-lg font-semibold text-gray-900">Cryptocurrency Financial Services</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Employees</dt>
                    <dd className="text-lg font-semibold text-gray-900">~400-500</dd>
                  </div>
                </dl>
              </div>
              <div className="bg-gray-50 p-8 lg:p-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Services</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Crypto Wallet</h4>
                      <p className="text-gray-600 text-sm">Digital wallets for Bitcoin, Ethereum, USDC and more</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Exchange Platform</h4>
                      <p className="text-gray-600 text-sm">Buy, sell, and trade cryptocurrencies</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Blockchain Explorer</h4>
                      <p className="text-gray-600 text-sm">Public blockchain data viewer</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Institutional Services</h4>
                      <p className="text-gray-600 text-sm">OTC trading and institutional infrastructure</p>
                    </div>
                  </li>
                </ul>
                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800">
                    <strong>Regulation:</strong> Blockchain.com is registered with the UK Financial Conduct 
                    Authority (FCA) for crypto asset activities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to start your crypto journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join millions of users who trust Blockchain.com with their cryptocurrency.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 text-lg px-8">
                Create Free Wallet
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-white font-semibold mb-4">Products</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition">Wallet</a></li>
                <li><a href="#" className="hover:text-white transition">Exchange</a></li>
                <li><a href="#" className="hover:text-white transition">Explorer</a></li>
                <li><a href="#" className="hover:text-white transition">Institutional</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Press</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition">API Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <span className="text-white font-bold">Blockchain.com</span>
              </div>
              <p className="text-sm text-center md:text-right">
                © {new Date().getFullYear()} Blockchain.com. All rights reserved.<br />
                Registered with the UK Financial Conduct Authority (FCA)
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
