export interface ApiErrorResult {
  message: string;
  errorCode: string;
  errorDetails?: string;
}

export function buildErrorResult(error: unknown): ApiErrorResult {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      return {
        message: "Unable to connect to the server. Check your connection.",
        errorCode: "NETWORK_ERROR",
      };
    }
    const cause = (
      error as Error & { cause?: { code?: string; details?: string } }
    ).cause;
    return {
      message: error.message,
      errorCode: cause?.code ?? "UNKNOWN_ERROR",
      errorDetails: cause?.details,
    };
  }
  return {
    message: "An unexpected error occurred.",
    errorCode: "UNKNOWN_ERROR",
  };
}

export function buildApiError(errorData: {
  message?: string;
  error?: string;
  code?: string;
  details?: string;
}): Error {
  const error = new Error(
    errorData.message || errorData.error || "Failed to send proposal",
  );
  (error as Error & { cause: object }).cause = {
    code: errorData.code,
    details: errorData.details,
  };
  return error;
}
