"use client";
import React, { useState } from "react";
import TestimonialSingle from "./testimonial-single";

const faqData = [
  {
    question: "What is Eclipse?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Eclipse Writers is a great tool  designed to assist writers and employers with
          managing their orders. Our goal is to save
          employers time and enhance the quality of the papers they get from Eclipse Writers portal.
        </p>
      </div>
    ),
  },
  {
    question: "How does Eclipse work?",
    answer:
      "Eclipse provides writers, employers and editors with their individual dashboards. This allows you to explore Eclipse's capabilities to either post orders, bid on orders, and get their orders edited.",
  },
  {
    question: "What features are included in the subscription plan?",
    answer:
      "The subscription plan offers unlimited access to orders for writers, order posting capability for employers, priority support, and access to imperative editorial services by our editors. It also grants you access to private writers and top-tier writers",
  },
  {
    question: "Can I try Eclipse before subscribing?",
    answer:
      "Absolutely! You can start with our free plan, which includes free sign up and bidding on the first order for all writers. Employers can only post orders after paying for their subscription.",
  },
  {
    question: "How does Eclipse Writers assist in planning for your orders?",
    answer:
      "Eclipse Writers allows employers to post their orders, track the progress, and get the quality report like turnitin AI and plagiarism report together with other quality tenets on their dashboards directly from our editors.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we take data security very seriously. All user data is encrypted, and we adhere to strict privacy policies to ensure your information and created content remain confidential.",
  },
  {
    question: "Is it affordable to use Eclipse Writers?",
    answer:
      "Absolutely! Employers pay a subscription of Kshs 750 monthly only plus a 9% on all orders for editing. This is like Kshs 30 for a 1 page order for editing, free AI and plagiarism reports. Writers pay Kshs 560 per month (Kshs 280 in a fortnight) and free academic writing training",
  },
  {
    question: "What subjects and grade levels does Eclipse support?",
    answer:
      "Eclipse supports a wide range of subjects and grade levels, from elementary to high school. With Eclipse, both technical and non-technical orders can be handled. We advise employers to post orders on Eclipse instead of using social media where conmanship is prevalent.",
  },
  {
    question: "Can employers privatize writers and get money back guarantee?",
    answer:
      "Absolutely. Employers can privatize writers on their dashboards and request 100 % money-back guarantee on their dashboards when their orders were unattended. This applies when employers escrowed their money but no writer placed a bbid on the order. We regularly update our content library on the Eclipse blog. Users receive notifications about new features and content on their dashboards whether or not they have paid for subscription.",
  },
  {
    question: "Can I collaborate with Editors on Eclipse?",
    answer:
      "Yes, our platform includes collaboration features that allow you to share and collaborate on how tp get the paper aced out with our editors, fostering faster completion and enabling the exchange of ideas.",
  },
];

const FAQItem = ({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <li>
      <button
        className="relative flex w-full items-center gap-2 border-t border-slate-200 py-5 text-left text-base font-semibold md:text-lg"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <span className="flex-1 text-slate-800">{question}</span>
        <svg
          className={`ml-auto h-4 w-4 flex-shrink-0 fill-current transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 12L2 6h12l-6 6z" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pb-5 leading-relaxed text-slate-600">
          {typeof answer === "string" ? <p>{answer}</p> : answer}
        </div>
      </div>
    </li>
  );
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-slate-50" id="faq">
      <div className="mx-auto max-w-7xl px-8 py-24">
        <div className="flex flex-col gap-12 md:flex-row">
          <div className="flex basis-1/2 flex-col text-left">
            <p className="mb-4 inline-block font-bold text-blue-500">FAQ</p>
            <p className="text-3xl font-extrabold text-slate-800 md:text-4xl">
              Get to Know Eclipse
            </p>
          </div>
          <ul className="basis-1/2">
            {faqData.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openIndex === index}
                onClick={() => handleToggle(index)}
              />
            ))}
          </ul>
        </div>
        <TestimonialSingle
          testimonial={{
            name: "Emily Akinyi",
            content:
              "Eclipse has assured me of my pay as a writer when I am sure I have done a great job unlike when I would work and get conned by fradulent employers. I can withdraw my pay directly from my wallet after a nice job.",
            schoolName: "Maseno",
            image: "https://api.dicebear.com/6.x/avataaars/svg?seed=Emily",
          }}
        />
      </div>
    </section>
  );
}
