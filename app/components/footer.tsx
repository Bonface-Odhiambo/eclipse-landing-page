import Image from "next/image";
import Link from "next/link";
import SVGLogo from "./svg-logo";
import artemImg from "../../public/artem.png";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="px-8 py-24 mx-auto max-w-7xl">
        <div className="flex flex-col flex-wrap md:flex-row md:flex-nowrap lg:items-start">
          <div className="flex-shrink-0 mx-auto w-64 text-center md:mx-0 md:text-left">
            <Link
              href="/"
              aria-current="page"
              className="flex gap-2 justify-center items-center md:justify-start"
            >
              <SVGLogo />
              <strong className="text-base font-extrabold tracking-tight text-slate-800 md:text-lg">
                Eclipse Writers
              </strong>
            </Link>
            <p className="mt-3 text-sm text-slate-700">
              Eclipse Writers is a Saas platform tailored to resolve quality issues that occur more oftenly between writers and employers. This tool helps writers escape the challenges of distrust with some employers and promotes genuine employers alongside offering great full-time support to all users. 
            </p>
            <p className="mt-3 text-sm text-slate-700">
              Copyright © {new Date().getFullYear()} - All rights reserved
            </p>
          </div>
          <div className="flex flex-wrap flex-grow justify-center mt-10 -mb-10 text-center md:mt-0 md:pl-24">
            <div className="px-4 w-full md:w-1/2 lg:w-1/3">
              <div className="mb-3 text-sm font-semibold tracking-widest footer-title text-slate-900 md:text-left">
                LINKS
              </div>
              <div className="flex flex-col gap-2 justify-center items-center mb-10 text-sm text-slate-700 hover:text-slate-900 md:items-start">
                <a
                  href="mailto:seclipsewriters@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover"
                  aria-label="Contact Support"
                >
                  Email: seclipsewriters@gmail.com
                </a>
                <Link href="/#pricing" className="link link-hover">
                  Phone: 0716212152
                </Link>
              </div>
            </div>
            <div className="px-4 w-full md:w-1/2 lg:w-1/3">
              <div className="mb-3 text-sm font-semibold tracking-widest footer-title text-slate-900 md:text-left">
                USE CASES
              </div>
              <div className="flex flex-col gap-2 justify-center items-center mb-10 text-sm text-slate-700 hover:text-slate-900 md:items-start">
                <Link href="/tos" className="link link-hover">
                  Terms of services
                </Link>
                <Link href="/privacy-policy" className="link link-hover">
                  Privacy policy
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 text-sm md:mt-16">
          <div className="flex flex-row gap-4 justify-start items-center">
            <Image
              alt="Eclipse Writers"
              src={artemImg}
              width={48}
              height={48}
              className="object-cover w-12 rounded-full aspect-square"
            />
            <div className="leading-relaxed text-left text-base-content-secondary">
              Hey Curious 👋 I&apos;m{" "}
              <a
                href="#"
                target="_blank"
                rel="noreferrer"
                className="font-medium link text-base-content"
              >
                Eclipse
              </a>
              , and I wanna help with your orders. Contact Us on WhatsApp or {""}
              <a
                href="https://x.com/odhiambookello5"
                target="_blank"
                rel="noreferrer"
                className="font-medium link text-base-content"
              >
                X.
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
