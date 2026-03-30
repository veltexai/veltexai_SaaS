// components/Meta.tsx
import Head from "next/head";

interface MetaProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
}

export const Meta: React.FC<MetaProps> = ({
  title = "Generate Professional Cleaning Proposals in Minutes",
  description = "Price jobs correctly and win more contracts with Veltex AI",
  url = "https://www.veltexai.com",
  image = "https://www.veltexai.com/images/og-image.png",
}) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="veltexai.com" />
      <meta property="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
};
