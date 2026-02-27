import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '@/i18n';
import { Button } from '@/components/ui/button';
import { 
  Shield, Globe, Smartphone, Lock, TrendingUp, Users,
  ChevronRight, Menu, X, Download
} from 'lucide-react';

const LandingPage = () => {
  const { t, lang, toggleLang } = useLang();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Blockchain.com</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition">{t.landNav_features}</a>
              <a href="#security" className="text-gray-600 hover:text-gray-900 transition">{t.landNav_security}</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition">{t.landNav_about}</a>
              <button onClick={toggleLang} className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-bold rounded border border-gray-300 hover:bg-gray-100 transition" data-testid="landing-language-toggle">
                <span className={lang === 'en' ? 'text-gray-900' : 'text-gray-400'}>EN</span>
                <span className="text-gray-300">|</span>
                <span className={lang === 'it' ? 'text-gray-900' : 'text-gray-400'}>IT</span>
              </button>
              <Link to="/login"><Button variant="ghost">{t.landNav_login}</Button></Link>
              <Link to="/register"><Button className="bg-blue-600 hover:bg-blue-700">{t.landNav_signup}</Button></Link>
              {showInstallPrompt && (
                <Button onClick={handleInstallClick} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />{t.landNav_install}
                </Button>
              )}
            </div>
            <div className="md:hidden flex items-center space-x-2">
              <button onClick={toggleLang} className="flex items-center space-x-1 px-2 py-1 text-xs font-bold rounded border border-gray-300">
                <span className={lang === 'en' ? 'text-gray-900' : 'text-gray-400'}>EN</span>
                <span className="text-gray-300">|</span>
                <span className={lang === 'it' ? 'text-gray-900' : 'text-gray-400'}>IT</span>
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-600 hover:text-gray-900">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-4">
              <a href="#features" className="block text-gray-600">{t.landNav_features}</a>
              <a href="#security" className="block text-gray-600">{t.landNav_security}</a>
              <a href="#about" className="block text-gray-600">{t.landNav_about}</a>
              <div className="flex flex-col space-y-2 pt-4 border-t border-gray-100">
                <Link to="/login"><Button variant="outline" className="w-full">{t.landNav_login}</Button></Link>
                <Link to="/register"><Button className="w-full bg-blue-600 hover:bg-blue-700">{t.landNav_signup}</Button></Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {t.landHero_title1}<span className="text-blue-600">{t.landHero_title2}</span>{t.landHero_title3}
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">{t.landHero_desc}</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-lg px-8">
                    {t.landHero_create}<ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">{t.landHero_access}</Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center"><Shield className="w-5 h-5 mr-2 text-green-500" />{t.landHero_fca}</div>
                <div className="flex items-center"><Lock className="w-5 h-5 mr-2 text-green-500" />{t.landHero_security}</div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-gray-500">{t.landHero_portfolioValue}</span>
                    <span className="text-green-500 text-sm">+5.24%</span>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-6">&euro;24,856.42</div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3"><span className="text-blue-600 font-bold">$</span></div>
                        <div><div className="font-semibold">USDC</div><div className="text-sm text-gray-500">USD Coin</div></div>
                      </div>
                      <div className="text-right"><div className="font-semibold">&euro;12,450.00</div><div className="text-sm text-gray-500">12,450 USDC</div></div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3"><span className="text-blue-600 font-bold">&euro;</span></div>
                        <div><div className="font-semibold">EUR</div><div className="text-sm text-gray-500">Euro</div></div>
                      </div>
                      <div className="text-right"><div className="font-semibold">&euro;11,500.00</div><div className="text-sm text-gray-500">{t.balance}</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div><div className="text-4xl font-bold text-blue-400">90M+</div><div className="mt-2 text-gray-400">{t.landStats_wallets}</div></div>
            <div><div className="text-4xl font-bold text-blue-400">&euro;1T+</div><div className="mt-2 text-gray-400">{t.landStats_transactions}</div></div>
            <div><div className="text-4xl font-bold text-blue-400">200+</div><div className="mt-2 text-gray-400">{t.landStats_countries}</div></div>
            <div><div className="text-4xl font-bold text-blue-400">2011</div><div className="mt-2 text-gray-400">{t.landStats_founded}</div></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t.landFeat_title}</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">{t.landFeat_desc}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Shield, color: 'blue', title: t.landFeat1_title, desc: t.landFeat1_desc },
              { icon: TrendingUp, color: 'green', title: t.landFeat2_title, desc: t.landFeat2_desc },
              { icon: Smartphone, color: 'purple', title: t.landFeat3_title, desc: t.landFeat3_desc },
              { icon: Globe, color: 'orange', title: t.landFeat4_title, desc: t.landFeat4_desc },
              { icon: Lock, color: 'red', title: t.landFeat5_title, desc: t.landFeat5_desc },
              { icon: Users, color: 'cyan', title: t.landFeat6_title, desc: t.landFeat6_desc },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition">
                <div className={`w-14 h-14 bg-${color}-100 rounded-xl flex items-center justify-center mb-6`}>
                  <Icon className={`w-7 h-7 text-${color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t.landSec_title}</h2>
              <p className="mt-4 text-xl text-gray-600">{t.landSec_desc}</p>
              <ul className="mt-8 space-y-4">
                {[t.landSec_aes, t.landSec_2fa, t.landSec_cold, t.landSec_audit, t.landSec_fca].map((item) => (
                  <li key={item} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="ml-3 text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white">
              <div className="text-center">
                <Shield className="w-20 h-20 mx-auto text-blue-400 mb-6" />
                <h3 className="text-2xl font-bold mb-4">{t.landSec_title2}</h3>
                <p className="text-gray-300 mb-8">{t.landSec_desc2}</p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/10 rounded-xl p-4"><div className="text-2xl font-bold text-blue-400">0</div><div className="text-sm text-gray-400">{t.landSec_breaches}</div></div>
                  <div className="bg-white/10 rounded-xl p-4"><div className="text-2xl font-bold text-blue-400">100%</div><div className="text-sm text-gray-400">{t.landSec_uptime}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{t.landAbout_title}</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">{t.landAbout_desc}</p>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="p-8 lg:p-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">{t.landAbout_overview}</h3>
                <dl className="space-y-4">
                  {[
                    [t.landAbout_founded, '2011'],
                    [t.landAbout_founders, 'Peter Smith, Ben Reeves, Nicolas Cary'],
                    [t.landAbout_ceo, 'Peter Smith'],
                    [t.landAbout_hq, t.landAbout_hqVal],
                    [t.landAbout_industry, t.landAbout_industryVal],
                    [t.landAbout_employees, '~400-500'],
                  ].map(([label, value]) => (
                    <div key={label}><dt className="text-sm text-gray-500">{label}</dt><dd className="text-lg font-semibold text-gray-900">{value}</dd></div>
                  ))}
                </dl>
              </div>
              <div className="bg-gray-50 p-8 lg:p-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">{t.landAbout_services}</h3>
                <ul className="space-y-4">
                  {[
                    [t.landAbout_svc1_title, t.landAbout_svc1_desc],
                    [t.landAbout_svc2_title, t.landAbout_svc2_desc],
                    [t.landAbout_svc3_title, t.landAbout_svc3_desc],
                    [t.landAbout_svc4_title, t.landAbout_svc4_desc],
                  ].map(([title, desc], i) => (
                    <li key={i} className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold">{i + 1}</span>
                      </div>
                      <div><h4 className="font-semibold text-gray-900">{title}</h4><p className="text-gray-600 text-sm">{desc}</p></div>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800"><strong>{t.landAbout_regulation}</strong> {t.landAbout_regDesc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">{t.landCTA_title}</h2>
          <p className="text-xl text-blue-100 mb-8">{t.landCTA_desc}</p>
          <Link to="/register">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8">
              {t.landCTA_btn}<ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-white font-semibold mb-4">{t.landFooter_products}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition">{t.landFooter_wallet}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_exchange}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_explorer}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_institutional}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t.landFooter_company}</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="hover:text-white transition">{t.landFooter_about}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_careers}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_press}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_blog}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t.landFooter_support}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition">{t.landFooter_help}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_contact}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_api}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_status}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t.landFooter_legal}</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition">{t.landFooter_privacy}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_terms}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_cookies}</a></li>
                <li><a href="#" className="hover:text-white transition">{t.landFooter_compliance}</a></li>
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
                &copy; {new Date().getFullYear()} Blockchain.com. {t.landFooter_rights}<br />
                {t.landFooter_fca}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
