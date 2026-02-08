export function getValidationMessage(errors: Record<string, any>, key: string): string {
    const e = errors[key];
    if (!e) return 'Please fix the errors in the form.';
    if (typeof e.message === 'string') return e.message;
    // Nested (e.g. global_inputs -> client_name)
    if (typeof e === 'object' && e !== null && !Array.isArray(e)) {
      const nestedKey = Object.keys(e).find((k) => k !== 'ref' && k !== 'type' && k !== 'message');
      if (nestedKey) {
        const nested = e[nestedKey];
        if (nested?.message) return nested.message;
        if (typeof nested === 'object' && nested !== null) {
          const deepKey = Object.keys(nested).find((k) => k !== 'ref' && k !== 'type');
          if (deepKey && (nested as any)[deepKey]?.message) return (nested as any)[deepKey].message;
        }
      }
    }
    return `Please fix the errors in the form (check ${key.replace(/_/g, ' ')}).`;
  }