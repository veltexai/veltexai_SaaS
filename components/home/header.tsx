'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <header className="sticky top-5 z-50">
      <nav className="border-b border-gray-100 bg-white/20 backdrop-blur-sm sticky top-0 z-50 max-w-4xl mx-4 md:mx-auto shadow-sm rounded-3xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Image
                width={60}
                height={60}
                src="/images/IMG_3800.png"
                alt="Image"
              />
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#testimonials"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reviews
              </Link>
              <Link
                href="#faq"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                FAQ
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Get Started
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-b border-gray-100 bg-white/20 backdrop-blur-sm shadow-sm rounded-b-3xl">
            <div className="px-4 py-4 space-y-4">
              <Link href="#features" className="block text-gray-600">
                Features
              </Link>
              <Link href="#pricing" className="block text-gray-600">
                Pricing
              </Link>
              <Link href="#testimonials" className="block text-gray-600">
                Reviews
              </Link>
              <Link href="#faq" className="block text-gray-600">
                FAQ
              </Link>
              <div className="pt-4 space-y-2">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full bg-white">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
