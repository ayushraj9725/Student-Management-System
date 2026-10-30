import '../index.css';

export const metadata = {
  title: 'My School Care',
  description: 'Multi-tenant institutional school management platform built with modular monolith architecture.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
