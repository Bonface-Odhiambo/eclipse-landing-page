"use client";

import Link from "next/link";
import { Popover } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "./container";
import { NavLinks } from "./nav-links";
import { Button } from "./button";
import SVGLogo from "./svg-logo";

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 6h14M5 18h14M5 12h14"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M17 14l-5-5-5 5"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface MobileNavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function MobileNavLink({ href, children, className, onClick }: MobileNavLinkProps) {
  return (
    <Link
      href={href}
      className={`block text-base tracking-tight leading-7 text-secondary-foreground ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function Header() {
  return (
    <header>
      <nav className="px-8 mx-auto max-w-6xl">
        <Container className="flex relative z-50 justify-between py-8">
          <div className="flex relative z-10 gap-16 justify-between items-center w-full">
            <Link href="/" className="flex gap-2 items-center font-semibold">
              <SVGLogo />
              <span className="text-lg font-bold text-slate-800">
                Eclipse Writers
              </span>
            </Link>
            <div className="hidden justify-center items-center lg:flex lg:gap-10">
              <NavLinks />
              <Link href="/sign-in">
                <Button color="blue">
                  Log in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button color="blue">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <Popover className="lg:hidden">
              {({ open }) => (
                <>
                  <Popover.Button
                    className="inline-flex relative z-10 items-center p-2 -m-2 rounded-lg ui-not-focus-visible:outline-none stroke-slate-900 hover:bg-slate-200/50 hover:stroke-slate-600 active:stroke-slate-900"
                    aria-label="Toggle site navigation"
                  >
                    {open ? (
                      <ChevronUpIcon className="w-6 h-6" />
                    ) : (
                      <MenuIcon className="w-6 h-6" />
                    )}
                  </Popover.Button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-0 backdrop-blur bg-slate-300/60"
                        />
                        <Popover.Panel
                          as={motion.div}
                          initial={{ opacity: 0, y: -32 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{
                            opacity: 0,
                            y: -32,
                            transition: { duration: 0.2 },
                          }}
                          className="absolute inset-x-0 top-0 z-0 px-6 pt-32 pb-6 rounded-b-2xl shadow-2xl origin-top bg-slate-50 shadow-slate-900/20"
                        >
                          <div className="space-y-4">
                            <MobileNavLink href="/#features">
                              Features
                            </MobileNavLink>
                            <MobileNavLink href="/#pricing">
                              Pricing
                            </MobileNavLink>
                            <MobileNavLink href="/#faq">About Us</MobileNavLink>
                            <MobileNavLink href="/blog">
                              Eclipse Blog
                            </MobileNavLink>
                          </div>
                          <div className="flex flex-col gap-4 mt-8">
                            <Link href="/sign-in">
                              <Button color="blue" className="w-full">
                                Log in
                              </Button>
                            </Link>
                            <Link href="/sign-up">
                              <Button color="blue" className="w-full">
                                Get Started
                              </Button>
                            </Link>
                          </div>
                        </Popover.Panel>
                      </>
                    )}
                  </AnimatePresence>
                </>
              )}
            </Popover>
          </div>
        </Container>
      </nav>
    </header>
  );
}