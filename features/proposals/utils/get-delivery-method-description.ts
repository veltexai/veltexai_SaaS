export const getDeliveryMethodDescription = (method: string) => {
    switch (method) {
      case 'pdf_only':
        return 'Send proposal as PDF attachment via email';
      case 'online_only':
        return 'Send secure online link to view proposal';
      case 'both':
        return 'Send both PDF attachment and online viewing link';
      default:
        return '';
    }
  };
