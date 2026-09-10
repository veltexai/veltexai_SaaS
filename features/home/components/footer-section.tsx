import Image from "next/image";
import Link from "next/link";
import React from "react";

const FooterSection = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4 bg-white w-fit rounded-sm px-1">
              <Image
                width={120}
                height={25}
                src="/images/IMG_3800.webp"
                alt="Veltex AI"
                loading="lazy"
                sizes="120px"
              />
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              AI Operating System for Janitorial Companies. Scope → Labor →
              Pricing → Proposal. Trusted since 1986.
            </p>
            <Link href="/tools/cleaning-bid-calculator" className="font-semibold text-blue-300 hover:text-white">Try the free cleaning bid calculator →</Link>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link
                  href="#features"
                  className="hover:text-white transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/solutions" className="hover:text-white transition-colors">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="/demo-proposal" className="hover:text-white transition-colors">
                  Demo Proposal
                </Link>
              </li>
              <li>
                <Link href="/tools/cleaning-bid-calculator" className="hover:text-white transition-colors">
                  Bid Calculator
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/resources" className="hover:text-white transition-colors">
                  Resources
                </Link>
              </li>
              <li>
                <a href="mailto:support@veltexservices.com" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Veltex AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
