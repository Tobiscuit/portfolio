
export type CaseStudySection = {
  title: string;
  text: string;
  image?: string;
  blurDataURL?: string;
  imageAlt?: string;
  list?: string[];
}

export type CaseStudy = {
  intro: CaseStudySection;
  sections: CaseStudySection[];
  conclusion: { title: string; text: string; };
  futureWork?: { title: string; intro: string; points: { title: string; text: string }[] };
  finalArchitecture?: { title: string; text: string; image?: string; blurDataURL?: string; imageAlt: string; };
}

export type Project = {
  id: number;
  title: string;
  description: string;
  features: string[];
  tech: string[];
  image?: string;
  blurDataURL?: string;
  url?: string;
  caseStudy?: CaseStudy;
}
