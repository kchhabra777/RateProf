export const OFFICIAL_ELECTIVES = {
  disciplineElectives: [
    { code: 'UCS531', name: 'Cloud Computing' },
    { code: 'UCS542', name: 'UI & UX Specialist' },
    { code: 'UCS548', name: 'Foundations of Data Science' },
    { code: 'UMC513', name: 'Linear Algebra for AI and ML' },
    { code: 'UCS551', name: 'Conversational AI: Accelerated Data Science' },
    { code: 'UCS532', name: 'Computer Vision' },
    { code: 'UCS539', name: 'Finance Accounting and Valuation' },
    { code: 'UCS668', name: 'Edge AI and Robotics: Data Centre Vision' },
    { code: 'UCS537', name: 'Source Code Management' },
    { code: 'UCS534', name: 'Computer & Network Security' },
    { code: 'UCS550', name: 'Network Defence' },
    { code: 'UEC646', name: 'Network & Communication for Connected Vehicles' }
  ],
  freeElectives: [
    { code: 'UMA069', name: 'Graph Theory and Applications' },
    { code: 'UHU018', name: 'Introduction to Corporate Finance' },
    { code: 'UMA070', name: 'Advanced Numerical Methods' },
    { code: 'UTD004', name: 'Campus 2 Corporate' },
    { code: 'UHU017', name: 'Introduction to Cognitive Science' },
    { code: 'UCS002', name: 'Introduction to Cyber Security' },
    { code: 'UPH064', name: 'Nano Science and Nano-Materials' },
    { code: 'UEN006', name: 'Technologies for Sustainable Development' },
    { code: 'UHU051', name: 'Creative Writing' },
    { code: 'UHU053', name: 'Gender, Identity and Technology' },
    { code: 'UBT510', name: 'Biology for Engineers' },
    { code: 'UHU016', name: 'Introductory Course in French' }
  ]
};

export const FREE_ELECTIVE_SET = new Set([
  'UMA069', 'UHU018', 'UMA070', 'UTD004', 'UHU017', 'UCS002',
  'UPH064', 'UEN006', 'UHU051', 'UHU053', 'UBT510', 'UHU016'
]);

export function getElectiveName(code) {
  if (!code) return '';
  const clean = code.trim().toUpperCase();
  for (const el of OFFICIAL_ELECTIVES.disciplineElectives) {
    if (el.code === clean) return el.name;
  }
  for (const el of OFFICIAL_ELECTIVES.freeElectives) {
    if (el.code === clean) return el.name;
  }
  return clean;
}

export function isFreeElective(code) {
  if (!code) return false;
  return FREE_ELECTIVE_SET.has(code.trim().toUpperCase());
}
