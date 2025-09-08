import Image from 'next/image';
import React from 'react';

const LoadingPage = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse w-96 h-96">
        <Image
          src="/illustrations/loading-bro.svg"
          alt="loading"
          width={300}
          height={300}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default LoadingPage;
