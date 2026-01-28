import ThemeRegistry from "./ThemeRegistry";
import AppShell from "@/app/components/AppShell";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const cookieMode = cookieStore.get("vado_colorMode")?.value;

  const initialMode = cookieMode === "dark" ? "dark" : "light";

  const initialUser = await getCurrentUser();

  return (
    <html lang="cs">
      <body>
        <ThemeRegistry initialMode={initialMode}>
          <AppShell initialUser={initialUser}>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
