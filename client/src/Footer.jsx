import React from "react";
import { Link } from "react-router-dom";
import { Github, Linkedin, Mail, Heart, ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main footer content with grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Brand and Mission */}
          <div className="md:col-span-2">
            <Link
              to="/"
              className="text-2xl font-bold text-white hover:text-gray-300 transition-colors flex items-center"
            >
              <Heart className="h-6 w-6 mr-2 text-teal-400" />
              Sahayog
            </Link>
            <p className="mt-4 text-gray-400 leading-relaxed max-w-sm">
              Empowering creators and innovators to bring their ideas to life
              through community funding. Together, we turn dreams into reality.
            </p>
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-2">
                Connect with the creator:
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://github.com/killjoycircuit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors group"
                  aria-label="GitHub Profile"
                >
                  <Github className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href="https://linkedin.com/in/killjoycircuit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors group"
                  aria-label="LinkedIn Profile"
                >
                  <Linkedin className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href="mailto:contact@sahayog.com"
                  className="text-gray-400 hover:text-teal-400 transition-colors group"
                  aria-label="Email Contact"
                >
                  <Mail className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-4">
              Explore
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/create-event"
                  className="hover:text-white transition-colors flex items-center"
                >
                  Start a Campaign
                  <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  className="hover:text-white transition-colors"
                >
                  Browse Campaigns
                </Link>
              </li>
              <li>
                <Link
                  to="/my-contributions"
                  className="hover:text-white transition-colors"
                >
                  My Contributions
                </Link>
              </li>
              <li>
                <Link
                  to="/my-campaigns"
                  className="hover:text-white transition-colors"
                >
                  My Campaigns
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar with copyright and additional info */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Sahayog. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Made with <Heart className="h-3 w-3 inline text-red-400" /> for
              creators worldwide
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
