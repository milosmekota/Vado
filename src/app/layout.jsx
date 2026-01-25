import ThemeRegistry from "./ThemeRegistry";

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
