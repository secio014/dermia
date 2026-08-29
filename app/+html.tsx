import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// Web-only: configura o HTML raiz de todas as páginas no render estático.
// Roda só em Node — sem acesso a DOM/APIs de browser.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>DermIA</title>
        <meta
          name="description"
          content="DermIA — acompanhamento clínico da evolução de queimaduras e lesões de pele."
        />
        <meta name="theme-color" content="#C81E3A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DermIA" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

        <meta property="og:title" content="DermIA" />
        <meta
          property="og:description"
          content="Acompanhamento clínico da evolução de queimaduras e lesões de pele."
        />
        <meta property="og:type" content="website" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />

        {/* Desativa o scroll do body na web — o ScrollView passa a se comportar como no nativo. */}
        <ScrollViewStyleReset />

        {/* CSS cru para o fundo não piscar branco antes do JS (inclusive em dark mode). */}
        <style dangerouslySetInnerHTML={{ __html: fundoResponsivo }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const fundoResponsivo = `
body {
  background-color: #FFF5F4;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
input, textarea, button, select {
  font-family: inherit;
}
/* Rolagem continua funcionando, só a barra fica invisível. */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
*::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1A0E0D;
  }
}`;
