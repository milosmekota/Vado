import ThemeRegistry from "./ThemeRegistry";
import AppShell from "@/app/components/AppShell";
import { cookies } from "next/headers";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const cookieMode = cookieStore.get("vado_colorMode")?.value;

  const initialMode = cookieMode === "dark" ? "dark" : "light";

  return (
    <html lang="cs">
      <body>
        <ThemeRegistry initialMode={initialMode}>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
