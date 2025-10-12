module.exports = {
  standard: 'WCAG2AA',
  timeout: 30000,
  wait: 1000,
  chromeLaunchConfig: {
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--headless'
    ]
  },
  ignore: [
    'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail'
  ],
  includeNotices: false,
  includeWarnings: true
};