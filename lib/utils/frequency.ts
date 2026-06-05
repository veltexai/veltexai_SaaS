export function isOneTimeFrequency(freq: string): boolean {
    const normalized = freq.toLowerCase().replace(/[\s_-]/g, '');
    return normalized === 'onetime';
  }
  

export function isStandardJanitorialService(service:string): boolean {
    const normalized = service.toLowerCase().replace(/[\s_-]/g, ''); 
    console.log('🚀 :', normalized === 'standardjanitorialservice');
    
    return normalized === 'standardjanitorialservice';
  }


