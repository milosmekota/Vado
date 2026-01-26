import ThemeRegistry from "./ThemeRegistry";
import AppShell from "@/app/components/AppShell";

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>
        <ThemeRegistry>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
