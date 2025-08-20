const config = {
  appName: 'Veltex Services Veliz',
  appDescription: 'Veltex Services Veliz is a platform for Generate PDF AI.',
  domainName:
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://veltexservicesveliz.com',
};

export default config;
