export type ComponentConfig = {
  [key: string]: any;
};

export type KeywordConfig = {
  [component: string]: ComponentConfig;
};

const keywordConfigs: { [keyword: string]: KeywordConfig } = {
  "ai-quiz-creation": {
    Hero: {
      title: "Editor-Assisted Paper Perfection",
      subtitle: "Create engaging papers for clients by removing flaws",
    },
    AccordionFeatures: {
      features: [
        { title: "Automated payment for employers and writers", description: "..." },
        { title: "The best wallet management system ever in Kenya", description: "..." },
      ],
    },
    BeforeAfter: {
      before: "Interactive writer dashboard",
      after: "Quick order posting for employers",
    },
    FAQ: {
      questions: [
        { question: "How does eclipse writers work?", answer: "It invokes the highest level of transparency and integrity" },
        { question: "Can I customize the papers I get from eclipse?", answer: "Absolutely." },
      ],
    },
    CTA: {
      title: "Start Writing on Eclipse Writers Today",
      buttonText: "Try the app now as a writer or employer or both",
    },
  },
  "The 9 % for employers": {
    Hero: {
      title: "It empowers you to sit back and relax",
      subtitle: "The editors handles all the quality issues for you all the time and are compensated with this 9% fee",
    },
  },
};

export default keywordConfigs;
